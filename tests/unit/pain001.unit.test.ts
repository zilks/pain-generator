import { describe, it, expect } from '@jest/globals';
import { buildMsgId, buildPmtInfId, buildInstrId, buildEndToEndId } from '../../src/utils/idGenerator';
import { resolveNbOfTxs, resolveCtrlSum, formatAmount } from '../../src/utils/calculator';
import { validatePain001Request } from '../../src/validation/pain001.validator';
import { buildV2009 } from '../../src/builder/pain001v2009.builder';
import { buildV2019 } from '../../src/builder/pain001v2019.builder';
import { ResolvedPain001Request } from '../../src/types/pain001.types';

// ─────────────────────────────────────────────────────────────
// ID Generator
// ─────────────────────────────────────────────────────────────
describe('idGenerator', () => {
  it('buildMsgId', () => {
    expect(buildMsgId('VERI-01', '2025-09-29')).toBe('MSG-VERI-01-2025-09-29');
  });
  it('buildMsgId – ohne randomSuffix gibt keine Zufallszahl zurück', () => {
    expect(buildMsgId('VERI-01', '2025-09-29', false)).toBe('MSG-VERI-01-2025-09-29');
  });
  it('buildMsgId – mit randomSuffix hängt 6-stellige Nummer an', () => {
    const result = buildMsgId('VERI-01', '2025-09-29', true);
    expect(result).toMatch(/^MSG-VERI-01-2025-09-29-\d{6}$/);
  });
  it('buildMsgId – Zufallszahl liegt zwischen 100000 und 999999', () => {
    const result = buildMsgId('VERI-01', '2025-09-29', true);
    const suffix = parseInt(result.split('-').pop()!, 10);
    expect(suffix).toBeGreaterThanOrEqual(100000);
    expect(suffix).toBeLessThanOrEqual(999999);
  });
  it('buildMsgId – verschiedene Aufrufe erzeugen (sehr wahrscheinlich) verschiedene Suffixe', () => {
    const results = new Set(Array.from({ length: 10 }, () => buildMsgId('VERI-01', '2025-09-29', true)));
    expect(results.size).toBeGreaterThan(1);
  });
  it('buildPmtInfId', () => {
    expect(buildPmtInfId('VERI-01', '2025-09-29')).toBe('PAY-VERI-01-2025-09-29');
  });
  it('buildInstrId – padded sequence', () => {
    expect(buildInstrId('VERI-01', 3, '2025-09-29')).toBe('INS-VERI-01-03-2025-09-29');
  });
  it('buildInstrId – sequence >= 10 is not padded', () => {
    expect(buildInstrId('VERI-01', 10, '2025-09-29')).toBe('INS-VERI-01-10-2025-09-29');
  });
  it('buildEndToEndId', () => {
    expect(buildEndToEndId('VERI-03', 1, '2025-09-29')).toBe('E2E-VERI-03-01-2025-09-29');
  });
});

// ─────────────────────────────────────────────────────────────
// Calculator
// ─────────────────────────────────────────────────────────────
describe('calculator', () => {
  const txs = [
    { sequenceNumber: 1, amount: 1.50, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'A' } },
    { sequenceNumber: 2, amount: 2.00, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'B' } },
    { sequenceNumber: 3, amount: 0.50, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'C' } },
  ];

  it('resolveNbOfTxs – auto', () => {
    expect(resolveNbOfTxs(txs)).toBe(3);
  });
  it('resolveNbOfTxs – explicit', () => {
    expect(resolveNbOfTxs(txs, 5)).toBe(5);
  });
  it('resolveNbOfTxs – empty array', () => {
    expect(resolveNbOfTxs([])).toBe(0);
  });
  it('resolveCtrlSum – auto', () => {
    expect(resolveCtrlSum(txs)).toBe(4.00);
  });
  it('resolveCtrlSum – explicit', () => {
    expect(resolveCtrlSum(txs, 99.99)).toBe(99.99);
  });
  it('resolveCtrlSum – floating-point precision (no 0.1+0.2 issue)', () => {
    const floatTxs = [
      { sequenceNumber: 1, amount: 0.1, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'A' } },
      { sequenceNumber: 2, amount: 0.2, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'B' } },
    ];
    expect(resolveCtrlSum(floatTxs)).toBe(0.30);
  });
  it('formatAmount – integer', () => {
    expect(formatAmount(1)).toBe('1.00');
  });
  it('formatAmount – one decimal place', () => {
    expect(formatAmount(1.5)).toBe('1.50');
  });
  it('formatAmount – truncated to 2 decimal places', () => {
    expect(formatAmount(100.123)).toBe('100.12');
  });
  it('formatAmount – large amount', () => {
    expect(formatAmount(999999.99)).toBe('999999.99');
  });
});

// ─────────────────────────────────────────────────────────────
// Validator
// ─────────────────────────────────────────────────────────────
describe('validator', () => {
  const validBody = {
    executionDate: '2025-09-29',
    testRunId: 'VERI-01',
    debtor: { name: 'Test AG', iban: 'CH9300762011623852957' },
    transactions: [
      {
        sequenceNumber: 1,
        amount: 1.00,
        currency: 'CHF',
        creditorIban: 'CH9300762011623852957',
        creditor: { name: 'Recipient GmbH' },
      },
    ],
  };

  it('valid request – no errors', () => {
    const result = validatePain001Request(validBody);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('missing executionDate', () => {
    const { executionDate, ...rest } = validBody;
    const result = validatePain001Request(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('executionDate'))).toBe(true);
  });

  it('executionDate wrong format', () => {
    const result = validatePain001Request({ ...validBody, executionDate: '29.09.2025' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('executionDate'))).toBe(true);
  });

  it('missing testRunId', () => {
    const { testRunId, ...rest } = validBody;
    const result = validatePain001Request(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('testRunId'))).toBe(true);
  });

  it('invalid IBAN in debtor', () => {
    const body = { ...validBody, debtor: { ...validBody.debtor, iban: 'NOTANIBAN' } };
    const result = validatePain001Request(body);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('debtor.iban'))).toBe(true);
  });

  it('missing debtor name', () => {
    const body = { ...validBody, debtor: { iban: 'CH9300762011623852957' } };
    const result = validatePain001Request(body);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('debtor.name'))).toBe(true);
  });

  it('invalid version', () => {
    const body = { ...validBody, version: 'v2099' };
    const result = validatePain001Request(body);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('version'))).toBe(true);
  });

  it('valid versions v2009 and v2019 are accepted', () => {
    expect(validatePain001Request({ ...validBody, version: 'v2009' }).valid).toBe(true);
    expect(validatePain001Request({ ...validBody, version: 'v2019' }).valid).toBe(true);
  });

  it('empty transactions array', () => {
    const body = { ...validBody, transactions: [] };
    const result = validatePain001Request(body);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('transactions'))).toBe(true);
  });

  it('transaction without amount', () => {
    const body = {
      ...validBody,
      transactions: [{ sequenceNumber: 1, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'X' } }],
    };
    const result = validatePain001Request(body);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('amount'))).toBe(true);
  });

  it('transaction with negative amount', () => {
    const body = {
      ...validBody,
      transactions: [{ sequenceNumber: 1, amount: -5, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'X' } }],
    };
    const result = validatePain001Request(body);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('amount'))).toBe(true);
  });

  it('transaction with invalid creditor IBAN', () => {
    const body = {
      ...validBody,
      transactions: [{ sequenceNumber: 1, amount: 10, currency: 'CHF', creditorIban: 'INVALID', creditor: { name: 'X' } }],
    };
    const result = validatePain001Request(body);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('creditorIban'))).toBe(true);
  });

  it('transaction with invalid currency code', () => {
    const body = {
      ...validBody,
      transactions: [{ sequenceNumber: 1, amount: 10, currency: 'XX', creditorIban: 'CH9300762011623852957', creditor: { name: 'X' } }],
    };
    const result = validatePain001Request(body);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('currency'))).toBe(true);
  });

  it('transaction without creditor.name', () => {
    const body = {
      ...validBody,
      transactions: [{ sequenceNumber: 1, amount: 10, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: {} }],
    };
    const result = validatePain001Request(body);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('creditor.name'))).toBe(true);
  });

  it('invalid creationDateTime format', () => {
    const result = validatePain001Request({ ...validBody, creationDateTime: '2025-09-29 11:11:11' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('creationDateTime'))).toBe(true);
  });

  it('valid creationDateTime is accepted', () => {
    const result = validatePain001Request({ ...validBody, creationDateTime: '2025-09-29T11:11:11' });
    expect(result.valid).toBe(true);
  });

  it('invalid postalAddress country code', () => {
    const body = {
      ...validBody,
      transactions: [{
        sequenceNumber: 1, amount: 10, currency: 'CHF',
        creditorIban: 'CH9300762011623852957',
        creditor: { name: 'X', postalAddress: { streetName: 'Str', postCode: '1000', townName: 'Bern', country: 'Switzerland' } },
      }],
    };
    const result = validatePain001Request(body);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('country'))).toBe(true);
  });

  it('non-JSON-object body', () => {
    const result = validatePain001Request('not an object');
    expect(result.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// XML Builder – v2009
// ─────────────────────────────────────────────────────────────
describe('XML Builder v2009', () => {
  const base: ResolvedPain001Request = {
    executionDate: '2025-09-29',
    testRunId: 'VERI-01',
    creationDateTime: '2025-09-29T11:11:11',
    debtor: { name: 'Test AG', iban: 'CH9300762011623852957', bic: 'BANKCH22XXX' },
    transactions: [
      {
        sequenceNumber: 1,
        amount: 1.00,
        currency: 'CHF',
        creditorIban: 'CH9300762011623852957',
        creditorIid: '769',
        creditor: {
          name: 'Recipient GmbH',
          postalAddress: {
            streetName: 'Hauptstrasse',
            buildingNumber: '1',
            postCode: '4001',
            townName: 'Basel',
            country: 'CH',
          },
        },
        remittanceInfoStructured: 'Invoice 2025-001',
      },
    ],
    version: 'v2009',
    batchBooking: true,
    nbOfTxs: 1,
    ctrlSum: 1.00,
  };

  it('contains correct namespace', () => {
    expect(buildV2009(base)).toContain('http://www.six-interbank-clearing.com/de/pain.001.001.03.ch.02.xsd');
  });

  it('contains MsgId', () => {
    expect(buildV2009(base)).toContain('<MsgId>MSG-VERI-01-2025-09-29</MsgId>');
  });

  it('contains NbOfTxs = 1', () => {
    expect(buildV2009(base)).toContain('<NbOfTxs>1</NbOfTxs>');
  });

  it('contains CtrlSum = 1.00', () => {
    expect(buildV2009(base)).toContain('<CtrlSum>1.00</CtrlSum>');
  });

  it('contains debtor IBAN', () => {
    expect(buildV2009(base)).toContain('<IBAN>CH9300762011623852957</IBAN>');
  });

  it('contains debtor BIC', () => {
    expect(buildV2009(base)).toContain('<BIC>BANKCH22XXX</BIC>');
  });

  it('debtor with IID instead of BIC', () => {
    const req = { ...base, debtor: { name: 'Test AG', iban: 'CH9300762011623852957', iid: '80808' } };
    const xml = buildV2009(req);
    expect(xml).toContain('<MmbId>80808</MmbId>');
    expect(xml).not.toContain('<BIC>');
  });

  it('ReqdExctnDt is not nested (v2009)', () => {
    const xml = buildV2009(base);
    expect(xml).toContain('<ReqdExctnDt>2025-09-29</ReqdExctnDt>');
  });

  it('BtchBookg false is rendered correctly', () => {
    const req = { ...base, batchBooking: false };
    expect(buildV2009(req)).toContain('<BtchBookg>false</BtchBookg>');
  });

  it('initiatingPartyName overrides debtor name', () => {
    const req = { ...base, initiatingPartyName: 'Treasury Dept' };
    expect(buildV2009(req)).toContain('<Nm>Treasury Dept</Nm>');
  });

  it('contains creditor IID (CdtrAgt)', () => {
    const xml = buildV2009(base);
    expect(xml).toContain('<MmbId>769</MmbId>');
  });

  it('contains structured remittance information', () => {
    const xml = buildV2009(base);
    expect(xml).toContain('<AddtlRmtInf>Invoice 2025-001</AddtlRmtInf>');
  });

  it('contains unstructured remittance information', () => {
    const req = {
      ...base,
      transactions: [{ ...base.transactions[0], remittanceInfoUnstructured: 'Free text', remittanceInfoStructured: undefined }],
    };
    expect(buildV2009(req)).toContain('<Ustrd>Free text</Ustrd>');
  });

  it('no RmtInf block when no remittance info is provided', () => {
    const req = {
      ...base,
      transactions: [{ ...base.transactions[0], remittanceInfoStructured: undefined, remittanceInfoUnstructured: undefined }],
    };
    expect(buildV2009(req)).not.toContain('<RmtInf>');
  });

  it('multiple transactions produce multiple CdtTrfTxInf blocks', () => {
    const req = {
      ...base,
      nbOfTxs: 2,
      ctrlSum: 3.00,
      transactions: [
        { sequenceNumber: 1, amount: 1.00, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'A' } },
        { sequenceNumber: 2, amount: 2.00, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'B' } },
      ],
    };
    const xml = buildV2009(req);
    const matches = xml.match(/<CdtTrfTxInf>/g);
    expect(matches).toHaveLength(2);
  });

  it('contains correct InstrId and EndToEndId', () => {
    const xml = buildV2009(base);
    expect(xml).toContain('<InstrId>INS-VERI-01-01-2025-09-29</InstrId>');
    expect(xml).toContain('<EndToEndId>E2E-VERI-01-01-2025-09-29</EndToEndId>');
  });

  it('PostalAddress strukturiert (STRD) enthält AdrTp und alle Felder', () => {
    const xml = buildV2009(base);
    expect(xml).toContain('<AdrTp>STRD</AdrTp>');
    expect(xml).toContain('<StrtNm>Hauptstrasse</StrtNm>');
    expect(xml).toContain('<BldgNb>1</BldgNb>');
    expect(xml).toContain('<PstCd>4001</PstCd>');
    expect(xml).toContain('<TwnNm>Basel</TwnNm>');
    expect(xml).toContain('<Ctry>CH</Ctry>');
  });

  it('PostalAddress unstrukturiert (ADDR) enthält AdrTp und AdrLine', () => {
    const req: ResolvedPain001Request = {
      ...base,
      transactions: [{
        ...base.transactions[0],
        creditor: {
          name: 'Recipient GmbH',
          postalAddress: {
            adrLine: ['Hauptstrasse 1', '4001 Basel'],
            country: 'CH',
          },
        },
      }],
    };
    const xml = buildV2009(req);
    expect(xml).toContain('<AdrTp>ADDR</AdrTp>');
    expect(xml).toContain('<AdrLine>Hauptstrasse 1</AdrLine>');
    expect(xml).toContain('<AdrLine>4001 Basel</AdrLine>');
    expect(xml).toContain('<Ctry>CH</Ctry>');
    expect(xml).not.toContain('<StrtNm>');
  });

  it('PostalAddress unstrukturiert (ADDR) rendert maximal 2 AdrLine-Einträge', () => {
    const req: ResolvedPain001Request = {
      ...base,
      transactions: [{
        ...base.transactions[0],
        creditor: {
          name: 'Recipient GmbH',
          postalAddress: {
            adrLine: ['Zeile 1', 'Zeile 2', 'Zeile 3'],
            country: 'CH',
          },
        },
      }],
    };
    const xml = buildV2009(req);
    expect(xml).toContain('<AdrLine>Zeile 1</AdrLine>');
    expect(xml).toContain('<AdrLine>Zeile 2</AdrLine>');
    expect(xml).not.toContain('<AdrLine>Zeile 3</AdrLine>');
  });
});

// ─────────────────────────────────────────────────────────────
// XML Builder – v2019
// ─────────────────────────────────────────────────────────────
describe('XML Builder v2019', () => {
  const resolved: ResolvedPain001Request = {
    executionDate: '2025-09-29',
    testRunId: 'VERI-01',
    creationDateTime: '2025-09-29T11:11:11',
    debtor: { name: 'Test AG', iban: 'CH9300762011623852957', bic: 'BANKCH22XXX' },
    transactions: [
      {
        sequenceNumber: 1,
        amount: 2.50,
        currency: 'CHF',
        creditorIban: 'CH9300762011623852957',
        creditorBic: 'POFICHBEXXX',
        creditor: {
          name: 'Recipient AG',
          postalAddress: {
            streetName: 'Bahnhofstrasse',
            buildingNumber: '10',
            postCode: '8001',
            townName: 'Zürich',
            country: 'CH',
          },
        },
        remittanceInfoUnstructured: 'Payment April 2025',
      },
    ],
    version: 'v2019',
    batchBooking: false,
    nbOfTxs: 1,
    ctrlSum: 2.50,
  };

  it('contains correct v2019 namespace', () => {
    const xml = buildV2019(resolved);
    expect(xml).toContain('urn:iso:std:iso:20022:tech:xsd:pain.001.001.09');
  });

  it('contains MsgId', () => {
    expect(buildV2019(resolved)).toContain('<MsgId>MSG-VERI-01-2025-09-29</MsgId>');
  });

  it('contains NbOfTxs = 1', () => {
    expect(buildV2019(resolved)).toContain('<NbOfTxs>1</NbOfTxs>');
  });

  it('contains CtrlSum = 2.50', () => {
    expect(buildV2019(resolved)).toContain('<CtrlSum>2.50</CtrlSum>');
  });

  it('contains PmtMtd = TRF', () => {
    expect(buildV2019(resolved)).toContain('<PmtMtd>TRF</PmtMtd>');
  });

  it('BtchBookg false is rendered correctly', () => {
    expect(buildV2019(resolved)).toContain('<BtchBookg>false</BtchBookg>');
  });

  it('BtchBookg true is rendered correctly', () => {
    const req = { ...resolved, batchBooking: true };
    expect(buildV2019(req)).toContain('<BtchBookg>true</BtchBookg>');
  });

  it('ReqdExctnDt is nested inside <Dt>', () => {
    const xml = buildV2019(resolved);
    expect(xml).toContain('<ReqdExctnDt>');
    expect(xml).toContain('<Dt>2025-09-29</Dt>');
  });

  it('contains debtor IBAN', () => {
    expect(buildV2019(resolved)).toContain('<IBAN>CH9300762011623852957</IBAN>');
  });

  it('uses BICFI instead of BIC for debtor agent', () => {
    const xml = buildV2019(resolved);
    expect(xml).toContain('<BICFI>BANKCH22XXX</BICFI>');
    expect(xml).not.toContain('<BIC>');
  });

  it('debtor agent with IID instead of BICFI', () => {
    const req = { ...resolved, debtor: { name: 'Test AG', iban: 'CH9300762011623852957', iid: '80808' } };
    const xml = buildV2019(req);
    expect(xml).toContain('<MmbId>80808</MmbId>');
    expect(xml).not.toContain('<BICFI>BANKCH22XXX</BICFI>');
  });

  it('initiatingPartyName overrides debtor name', () => {
    const req = { ...resolved, initiatingPartyName: 'Treasury Dept' };
    expect(buildV2019(req)).toContain('<Nm>Treasury Dept</Nm>');
  });

  it('contains correct InstrId and EndToEndId', () => {
    const xml = buildV2019(resolved);
    expect(xml).toContain('<InstrId>INS-VERI-01-01-2025-09-29</InstrId>');
    expect(xml).toContain('<EndToEndId>E2E-VERI-01-01-2025-09-29</EndToEndId>');
  });

  it('uses BICFI instead of BIC for creditor agent', () => {
    const xml = buildV2019(resolved);
    expect(xml).toContain('<BICFI>POFICHBEXXX</BICFI>');
  });

  it('creditor agent with IID (ClrSysMmbId)', () => {
    const req = {
      ...resolved,
      transactions: [{ ...resolved.transactions[0], creditorBic: undefined, creditorIid: '769' }],
    };
    const xml = buildV2019(req);
    expect(xml).toContain('<MmbId>769</MmbId>');
    expect(xml).not.toContain('<BICFI>POFICHBEXXX</BICFI>');
  });

  it('PstlAdr contains direct address fields (no AdrTp – PostalAddress24_pain001_ch_3)', () => {
    const xml = buildV2019(resolved);
    expect(xml).not.toContain('<AdrTp>');
    expect(xml).toContain('<StrtNm>Bahnhofstrasse</StrtNm>');
    expect(xml).toContain('<BldgNb>10</BldgNb>');
    expect(xml).toContain('<PstCd>8001</PstCd>');
    expect(xml).toContain('<TwnNm>Zürich</TwnNm>');
    expect(xml).toContain('<Ctry>CH</Ctry>');
  });

  it('contains unstructured remittance information', () => {
    const xml = buildV2019(resolved);
    expect(xml).toContain('<Ustrd>Payment April 2025</Ustrd>');
  });

  it('contains structured remittance information', () => {
    const req = {
      ...resolved,
      transactions: [{ ...resolved.transactions[0], remittanceInfoUnstructured: undefined, remittanceInfoStructured: 'Invoice 2025-001' }],
    };
    expect(buildV2019(req)).toContain('<AddtlRmtInf>Invoice 2025-001</AddtlRmtInf>');
  });

  it('no RmtInf block when no remittance info is provided', () => {
    const req = {
      ...resolved,
      transactions: [{ ...resolved.transactions[0], remittanceInfoUnstructured: undefined, remittanceInfoStructured: undefined }],
    };
    expect(buildV2019(req)).not.toContain('<RmtInf>');
  });

  it('multiple transactions produce multiple CdtTrfTxInf blocks', () => {
    const req = {
      ...resolved,
      nbOfTxs: 3,
      ctrlSum: 6.00,
      transactions: [
        { sequenceNumber: 1, amount: 1.00, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'A' } },
        { sequenceNumber: 2, amount: 2.00, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'B' } },
        { sequenceNumber: 3, amount: 3.00, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'C' } },
      ],
    };
    const xml = buildV2019(req);
    const matches = xml.match(/<CdtTrfTxInf>/g);
    expect(matches).toHaveLength(3);
  });

  it('PostalAddress strukturiert enthält kein AdrTp (PostalAddress24_pain001_ch_3)', () => {
    const xml = buildV2019(resolved);
    expect(xml).toContain('<StrtNm>Bahnhofstrasse</StrtNm>');
    expect(xml).toContain('<PstCd>8001</PstCd>');
    expect(xml).toContain('<TwnNm>Zürich</TwnNm>');
    expect(xml).toContain('<Ctry>CH</Ctry>');
    expect(xml).not.toContain('<AdrTp>');
  });

  it('PostalAddress adrLine wird in v2019 ignoriert (kein AdrLine im XML)', () => {
    const req: ResolvedPain001Request = {
      ...resolved,
      transactions: [{
        ...resolved.transactions[0],
        creditor: {
          name: 'Recipient AG',
          postalAddress: {
            adrLine: ['Bahnhofstrasse 10', '8001 Zürich'],
            country: 'CH',
          },
        },
      }],
    };
    const xml = buildV2019(req);
    expect(xml).not.toContain('<AdrLine>');
    expect(xml).not.toContain('<AdrTp>');
    expect(xml).toContain('<Ctry>CH</Ctry>');
  });
});

