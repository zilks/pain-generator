// ============================================================
// PAIN.001 v2019 Builder
// Schema: pain.001.001.09.ch.03.xsd  (SIX, active from 2020)
//
// ⚠️  TODO: IMPLEMENTATION INCOMPLETE
// -------------------------------------------------------
// This builder is NOT production-ready yet.
// The following steps still need to be completed:
//
//   1. Obtain the XSD:
//      - Request pain.001.001.09.ch.03.xsd from SIX/Swiss Interbank Clearing
//      - Place the file under /schema/pain.001.001.09.ch.03.xsd
//
//   2. Validate XML structure against the XSD:
//      - Verify AdrTp/Cd "STRUCTURED" (correct nesting per XSD)
//      - Verify ReqdExctnDt/<Dt> (ISO 20022 R11 structure)
//      - Verify BICFI vs. BIC field naming
//      - Add PmtTpInf (ServiceLevel, LocalInstrument) if required
//      - Verify element order against XSD sequence
//
//   3. Add tests:
//      - Integrate XSD validation into tests/pain001.test.ts
//      - Add test cases for all required and optional fields
//
//   4. Enable in handler:
//      - Remove the TODO block in pain001.handler.ts
//      - Re-wire buildV2019 into the routing logic
//
// Known differences from v2009:
//   - New namespace / XSD name
//   - PstlAdr: type "STRUCTURED" via AdrTp/Cd
//   - ReqdExctnDt: nested inside <Dt> (ISO 20022 R11)
//   - BICFI instead of BIC as field name
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

const NAMESPACE_V2019 = 'http://www.six-interbank-clearing.com/de/pain.001.001.09.ch.03.xsd';
const SCHEMA_LOCATION_V2019 = 'pain.001.001.09.ch.03.xsd';

export function buildV2019(req: ResolvedPain001Request): string {
  const { executionDate, testRunId, creationDateTime, debtor, transactions, nbOfTxs, ctrlSum, batchBooking } = req;

  const msgId    = buildMsgId(testRunId, executionDate);
  const pmtInfId = buildPmtInfId(testRunId, executionDate);

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Document', {
      'xmlns': NAMESPACE_V2019,
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': `${NAMESPACE_V2019} ${SCHEMA_LOCATION_V2019}`,
    });

  const root = doc.ele('CstmrCdtTrfInitn');

  // ── GrpHdr ──────────────────────────────────────────────
  const grpHdr = root.ele('GrpHdr');
  grpHdr.ele('MsgId').txt(msgId);
  grpHdr.ele('CreDtTm').txt(creationDateTime);
  grpHdr.ele('NbOfTxs').txt(String(nbOfTxs));
  grpHdr.ele('CtrlSum').txt(formatAmount(ctrlSum));
  grpHdr.ele('InitgPty').ele('Nm').txt(req.initiatingPartyName ?? debtor.name);

  // ── PmtInf ──────────────────────────────────────────────
  const pmtInf = root.ele('PmtInf');
  pmtInf.ele('PmtInfId').txt(pmtInfId);
  pmtInf.ele('PmtMtd').txt('TRF');
  pmtInf.ele('BtchBookg').txt(String(batchBooking));

  // v2019: ReqdExctnDt is nested inside <Dt>
  pmtInf.ele('ReqdExctnDt').ele('Dt').txt(executionDate);

  // Debtor
  pmtInf.ele('Dbtr').ele('Nm').txt(debtor.name);

  // Debtor account
  pmtInf
    .ele('DbtrAcct')
    .ele('Id')
    .ele('IBAN')
    .txt(debtor.iban.replace(/\s/g, ''));

  // Debtor agent
  const dbtrAgt = pmtInf.ele('DbtrAgt').ele('FinInstnId');
  if (debtor.bic) {
    // v2019: BICFI instead of BIC
    dbtrAgt.ele('BICFI').txt(debtor.bic);
  } else if (debtor.iid) {
    dbtrAgt
      .ele('ClrSysMmbId')
      .ele('ClrSysId')
      .ele('Cd').txt('CHBCC').up()
      .up()
      .ele('MmbId').txt(debtor.iid);
  }

  // ── CdtTrfTxInf ─────────────────────────────────────────
  for (const tx of transactions) {
    buildCreditTransferV2019(pmtInf, tx, testRunId, executionDate);
  }

  return doc.end({ prettyPrint: true });
}

function buildCreditTransferV2019(
  pmtInf: XMLBuilder,
  tx: CreditTransfer,
  testRunId: string,
  date: string
): void {
  const cdtTrf = pmtInf.ele('CdtTrfTxInf');

  // Payment ID
  const pmtId = cdtTrf.ele('PmtId');
  pmtId.ele('InstrId').txt(buildInstrId(testRunId, tx.sequenceNumber, date));
  pmtId.ele('EndToEndId').txt(buildEndToEndId(testRunId, tx.sequenceNumber, date));

  // Amount
  cdtTrf
    .ele('Amt')
    .ele('InstdAmt', { Ccy: tx.currency })
    .txt(formatAmount(tx.amount));

  // Creditor agent
  const cdtrAgt = cdtTrf.ele('CdtrAgt').ele('FinInstnId');
  if (tx.creditorBic) {
    // v2019: BICFI
    cdtrAgt.ele('BICFI').txt(tx.creditorBic);
  } else if (tx.creditorIid) {
    cdtrAgt
      .ele('ClrSysMmbId')
      .ele('ClrSysId')
      .ele('Cd').txt('CHBCC').up()
      .up()
      .ele('MmbId').txt(tx.creditorIid);
  }

  // Creditor – v2019: PstlAdr with AdrTp STRUCTURED
  const cdtr = cdtTrf.ele('Cdtr');
  cdtr.ele('Nm').txt(tx.creditor.name);
  if (tx.creditor.postalAddress) {
    const pa = tx.creditor.postalAddress;
    const pstlAdr = cdtr.ele('PstlAdr');
    // v2019: structured address type
    pstlAdr.ele('AdrTp').ele('Cd').txt('STRUCTURED');
    pstlAdr.ele('StrtNm').txt(pa.streetName);
    if (pa.buildingNumber) {
      pstlAdr.ele('BldgNb').txt(pa.buildingNumber);
    }
    pstlAdr.ele('PstCd').txt(pa.postCode);
    pstlAdr.ele('TwnNm').txt(pa.townName);
    pstlAdr.ele('Ctry').txt(pa.country);
  }

  // Creditor account
  cdtTrf
    .ele('CdtrAcct')
    .ele('Id')
    .ele('IBAN')
    .txt(tx.creditorIban.replace(/\s/g, ''));

  // Remittance information
  if (tx.remittanceInfoUnstructured || tx.remittanceInfoStructured) {
    const rmtInf = cdtTrf.ele('RmtInf');
    if (tx.remittanceInfoUnstructured) {
      rmtInf.ele('Ustrd').txt(tx.remittanceInfoUnstructured);
    }
    if (tx.remittanceInfoStructured) {
      rmtInf
        .ele('Strd')
        .ele('AddtlRmtInf')
        .txt(tx.remittanceInfoStructured);
    }
  }
}
