// ============================================================
// Base builder – shared PAIN.001 structure (GrpHdr + PmtInf)
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

export interface SchemaConfig {
  namespace: string;
  schemaLocation: string;
}

/**
 * Builds the complete PAIN.001 XML document.
 * The namespace/schemaLocation is injected by the version-specific builders.
 */
export function buildPain001Xml(
  req: ResolvedPain001Request,
  schema: SchemaConfig
): string {
  const { executionDate, testRunId, creationDateTime, debtor, transactions, nbOfTxs, ctrlSum, batchBooking } = req;

  const msgId    = buildMsgId(testRunId, executionDate);
  const pmtInfId = buildPmtInfId(testRunId, executionDate);

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Document', {
      'xmlns': schema.namespace,
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': `${schema.namespace} ${schema.schemaLocation}`,
    });

  const root = doc.ele('CstmrCdtTrfInitn');

  // ── GrpHdr ──────────────────────────────────────────────
  const grpHdr = root.ele('GrpHdr');
  grpHdr.ele('MsgId').txt(msgId);
  grpHdr.ele('CreDtTm').txt(creationDateTime);
  grpHdr.ele('NbOfTxs').txt(String(nbOfTxs));
  grpHdr.ele('CtrlSum').txt(formatAmount(ctrlSum));
  const initgPty = grpHdr.ele('InitgPty');
  initgPty.ele('Nm').txt(req.initiatingPartyName ?? debtor.name);

  // ── PmtInf ──────────────────────────────────────────────
  const pmtInf = root.ele('PmtInf');
  pmtInf.ele('PmtInfId').txt(pmtInfId);
  pmtInf.ele('PmtMtd').txt('TRF');
  pmtInf.ele('BtchBookg').txt(String(batchBooking));
  pmtInf.ele('ReqdExctnDt').txt(executionDate);

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
    dbtrAgt.ele('BIC').txt(debtor.bic);
  } else if (debtor.iid) {
    dbtrAgt
      .ele('ClrSysMmbId')
      .ele('ClrSysId')
      .ele('Cd').txt('CHBCC').up()
      .up()
      .ele('MmbId').txt(debtor.iid);
  }

  // ── CdtTrfTxInf (one per transaction) ───────────────────
  for (const tx of transactions) {
    buildCreditTransfer(pmtInf, tx, testRunId, executionDate);
  }

  return doc.end({ prettyPrint: true });
}

function buildCreditTransfer(
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
    cdtrAgt.ele('BIC').txt(tx.creditorBic);
  } else if (tx.creditorIid) {
    cdtrAgt
      .ele('ClrSysMmbId')
      .ele('ClrSysId')
      .ele('Cd').txt('CHBCC').up()
      .up()
      .ele('MmbId').txt(tx.creditorIid);
  }

  // Creditor
  const cdtr = cdtTrf.ele('Cdtr');
  cdtr.ele('Nm').txt(tx.creditor.name);
  if (tx.creditor.postalAddress) {
    const pa = tx.creditor.postalAddress;
    const pstlAdr = cdtr.ele('PstlAdr');
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
