// ============================================================
// PAIN.001 v2019 Builder
// Schema: pain.001.001.09.ch.03.xsd  (SIX, active from 2020)
// Namespace: urn:iso:std:iso:20022:tech:xsd:pain.001.001.09
//
// Key differences from v2009:
//   - Namespace: urn:iso:std:iso:20022:tech:xsd:pain.001.001.09
//   - ReqdExctnDt: nested inside <Dt> (DateAndDateTime2Choice)
//   - BICFI instead of BIC (FinancialInstitutionIdentification18)
//   - PstlAdr (PostalAddress24_pain001_ch_3): no AdrTp, direct fields only
//   - Element order strictly follows PaymentInstruction30_pain001_ch
// ============================================================

import { create } from 'xmlbuilder2';
import type { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { ResolvedPain001Request, CreditTransfer } from '../types/pain001.types';
import {
  buildMsgId,
  buildPmtInfId,
  buildInstrId,
  buildEndToEndId,
} from '../utils/idGenerator';
import { formatAmount } from '../utils/calculator';

const NAMESPACE_V2019    = 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.09';
const SCHEMA_LOCATION_V2019 = 'pain.001.001.09.ch.03.xsd';

export function buildV2019(req: ResolvedPain001Request): string {
  const {
    executionDate, testRunId, creationDateTime,
    debtor, transactions, nbOfTxs, ctrlSum, batchBooking,
  } = req;

  const msgId    = buildMsgId(testRunId, executionDate);
  const pmtInfId = buildPmtInfId(testRunId, executionDate);

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Document', {
      'xmlns':              NAMESPACE_V2019,
      'xmlns:xsi':          'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': `${NAMESPACE_V2019} ${SCHEMA_LOCATION_V2019}`,
    });

  const root = doc.ele('CstmrCdtTrfInitn');

  // ── GrpHdr (GroupHeader85_pain001_ch) ────────────────────
  // Sequence: MsgId → CreDtTm → NbOfTxs → CtrlSum → InitgPty
  const grpHdr = root.ele('GrpHdr');
  grpHdr.ele('MsgId').txt(msgId);
  grpHdr.ele('CreDtTm').txt(creationDateTime);
  grpHdr.ele('NbOfTxs').txt(String(nbOfTxs));
  grpHdr.ele('CtrlSum').txt(formatAmount(ctrlSum));
  grpHdr.ele('InitgPty').ele('Nm').txt(req.initiatingPartyName ?? debtor.name);

  // ── PmtInf (PaymentInstruction30_pain001_ch) ─────────────
  // Sequence: PmtInfId → PmtMtd → BtchBookg → NbOfTxs → CtrlSum
  //           → ReqdExctnDt → Dbtr → DbtrAcct → DbtrAgt → CdtTrfTxInf
  const pmtInf = root.ele('PmtInf');
  pmtInf.ele('PmtInfId').txt(pmtInfId);
  pmtInf.ele('PmtMtd').txt('TRF');
  pmtInf.ele('BtchBookg').txt(String(batchBooking));

  // v2019: ReqdExctnDt uses DateAndDateTime2Choice → <Dt>
  pmtInf.ele('ReqdExctnDt').ele('Dt').txt(executionDate);

  // Debtor (PartyIdentification135_pain001_ch_2): Nm, PstlAdr, Id
  pmtInf.ele('Dbtr').ele('Nm').txt(debtor.name);

  // Debtor account
  pmtInf.ele('DbtrAcct').ele('Id').ele('IBAN').txt(debtor.iban.replace(/\s/g, ''));

  // Debtor agent (FinancialInstitutionIdentification18_pain001_ch_2): BICFI | ClrSysMmbId
  const dbtrAgt = pmtInf.ele('DbtrAgt').ele('FinInstnId');
  if (debtor.bic) {
    dbtrAgt.ele('BICFI').txt(debtor.bic);
  } else if (debtor.iid) {
    dbtrAgt
      .ele('ClrSysMmbId')
      .ele('ClrSysId').ele('Cd').txt('CHBCC').up()
      .up()
      .ele('MmbId').txt(debtor.iid);
  }

  // ── CdtTrfTxInf (one per transaction) ───────────────────
  for (const tx of transactions) {
    buildCreditTransferV2019(pmtInf, tx, testRunId, executionDate);
  }

  return doc.end({ prettyPrint: true });
}

function buildCreditTransferV2019(
  pmtInf: XMLBuilder,
  tx: CreditTransfer,
  testRunId: string,
  date: string,
): void {
  // Sequence per CreditTransferTransaction34_pain001_ch:
  // PmtId → Amt → CdtrAgt → Cdtr → CdtrAcct → RmtInf
  const cdtTrf = pmtInf.ele('CdtTrfTxInf');

  // Payment ID (PaymentIdentification6_pain001_ch)
  const pmtId = cdtTrf.ele('PmtId');
  pmtId.ele('InstrId').txt(buildInstrId(testRunId, tx.sequenceNumber, date));
  pmtId.ele('EndToEndId').txt(buildEndToEndId(testRunId, tx.sequenceNumber, date));

  // Amount
  cdtTrf.ele('Amt').ele('InstdAmt', { Ccy: tx.currency }).txt(formatAmount(tx.amount));

  // Creditor agent (FinancialInstitutionIdentification18_pain001_ch_4): BICFI | ClrSysMmbId
  if (tx.creditorBic || tx.creditorIid) {
    const cdtrAgt = cdtTrf.ele('CdtrAgt').ele('FinInstnId');
    if (tx.creditorBic) {
      cdtrAgt.ele('BICFI').txt(tx.creditorBic);
    } else if (tx.creditorIid) {
      cdtrAgt
        .ele('ClrSysMmbId')
        .ele('ClrSysId').ele('Cd').txt('CHBCC').up()
        .up()
        .ele('MmbId').txt(tx.creditorIid);
    }
  }

  // Creditor (PartyIdentification135_pain001_ch_4): Nm required, PstlAdr optional
  // PstlAdr uses PostalAddress24_pain001_ch_3 – no AdrTp, direct fields only (always structured)
  const cdtr = cdtTrf.ele('Cdtr');
  cdtr.ele('Nm').txt(tx.creditor.name);
  if (tx.creditor.postalAddress) {
    const pa = tx.creditor.postalAddress;
    const pstlAdr = cdtr.ele('PstlAdr');
    if (pa.streetName) pstlAdr.ele('StrtNm').txt(pa.streetName);
    if (pa.buildingNumber) pstlAdr.ele('BldgNb').txt(pa.buildingNumber);
    if (pa.postCode) pstlAdr.ele('PstCd').txt(pa.postCode);
    if (pa.townName) pstlAdr.ele('TwnNm').txt(pa.townName);
    pstlAdr.ele('Ctry').txt(pa.country);
  }

  // Creditor account
  cdtTrf.ele('CdtrAcct').ele('Id').ele('IBAN').txt(tx.creditorIban.replace(/\s/g, ''));

  // Remittance information (RemittanceInformation16_pain001_ch)
  if (tx.remittanceInfoUnstructured || tx.remittanceInfoStructured) {
    const rmtInf = cdtTrf.ele('RmtInf');
    if (tx.remittanceInfoUnstructured) {
      rmtInf.ele('Ustrd').txt(tx.remittanceInfoUnstructured);
    }
    if (tx.remittanceInfoStructured) {
      rmtInf.ele('Strd').ele('AddtlRmtInf').txt(tx.remittanceInfoStructured);
    }
  }
}
