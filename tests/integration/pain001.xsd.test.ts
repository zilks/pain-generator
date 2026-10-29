import { describe, it, expect } from '@jest/globals';
import { handleGeneratePain001 } from '../../src/pain001.handler';
import { buildV2009 } from '../../src/builder/pain001v2009.builder';
import { ResolvedPain001Request } from '../../src/types/pain001.types';
import { validateAgainstXsd, formatXsdErrors } from '../helpers/xsdValidator';

// ─────────────────────────────────────────────────────────────
// XSD validation
// Generates XML via the handler and validates it against the
// SIX schemas in src/schemas (v2009: pain.001.001.03.ch.02,
// v2019: pain.001.001.09.ch.03).
// ─────────────────────────────────────────────────────────────

const baseBody = {
  executionDate: '2025-09-29',
  testRunId: 'VERI-01',
  creationDateTime: '2025-09-28T10:15:30',
  debtor: { name: 'Test AG', iban: 'CH9300762011623852957', bic: 'UBSWCHZH80A' },
  transactions: [
    { sequenceNumber: 1, amount: 100.0, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'Recipient GmbH' } },
  ],
};

const scenarios: { name: string; body: Record<string, unknown> }[] = [
  { name: 'minimal request', body: baseBody },
  {
    name: 'debtor without BIC (no DbtrAgt identifier given)',
    body: { ...baseBody, debtor: { name: 'Test AG', iban: 'CH9300762011623852957' } },
  },
  {
    name: 'debtor with IID instead of BIC',
    body: { ...baseBody, debtor: { name: 'Test AG', iban: 'CH9300762011623852957', iid: '00762' } },
  },
  {
    name: 'initiatingPartyName, batchBooking false and randomMsgId',
    body: { ...baseBody, initiatingPartyName: 'Initiator AG', batchBooking: false, randomMsgId: true },
  },
  {
    name: 'multiple transactions with creditor BIC and IID',
    body: {
      ...baseBody,
      transactions: [
        { sequenceNumber: 1, amount: 1.5, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditorBic: 'UBSWCHZH80A', creditor: { name: 'A' } },
        { sequenceNumber: 2, amount: 2.5, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditorIid: '00762', creditor: { name: 'B' } },
        { sequenceNumber: 10, amount: 1234567.89, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'C' } },
      ],
    },
  },
  {
    name: 'unstructured remittance information',
    body: {
      ...baseBody,
      transactions: [{ ...baseBody.transactions[0], remittanceInfoUnstructured: 'Rechnung 2025-0001' }],
    },
  },
  {
    name: 'SEPA payment type (automatic, EUR to DE IBAN)',
    body: {
      ...baseBody,
      transactions: [{ ...baseBody.transactions[0], currency: 'EUR', creditorIban: 'DE89370400440532013000' }],
    },
  },
  {
    name: 'explicit SWIFT payment type (USD)',
    body: {
      ...baseBody,
      paymentType: 'SWIFT',
      transactions: [{ ...baseBody.transactions[0], currency: 'USD', creditorIban: 'DE89370400440532013000' }],
    },
  },
  {
    name: 'structured remittance information',
    body: {
      ...baseBody,
      transactions: [{ ...baseBody.transactions[0], remittanceInfoStructured: 'Zusatzinfo 2025-0001' }],
    },
  },
  {
    name: 'structured remittance with explicit SCOR reference and Ustrd',
    body: {
      ...baseBody,
      transactions: [{ ...baseBody.transactions[0], remittanceInfoUnstructured: 'Rechnung', creditorReference: 'RF18539007547034' }],
    },
  },
  {
    name: 'QR-IBAN with generated QR reference',
    body: {
      ...baseBody,
      transactions: [{ ...baseBody.transactions[0], creditorIban: 'CH4431999123000889012', remittanceInfoStructured: 'QR-Rechnung' }],
    },
  },
  {
    name: 'structured creditor postal address',
    body: {
      ...baseBody,
      transactions: [{
        ...baseBody.transactions[0],
        creditor: {
          name: 'Recipient GmbH',
          postalAddress: { streetName: 'Bahnhofstrasse', buildingNumber: '1', postCode: '8001', townName: 'Zürich', country: 'CH' },
        },
      }],
    },
  },
  {
    name: 'structured creditor postal address with only town and country',
    body: {
      ...baseBody,
      transactions: [{
        ...baseBody.transactions[0],
        creditor: { name: 'Recipient GmbH', postalAddress: { townName: 'Zürich', country: 'CH' } },
      }],
    },
  },
  {
    name: 'creditor postal address with only country',
    body: {
      ...baseBody,
      transactions: [{
        ...baseBody.transactions[0],
        creditor: { name: 'Recipient GmbH', postalAddress: { country: 'CH' } },
      }],
    },
  },
  {
    name: 'EUR payment to a German creditor',
    body: {
      ...baseBody,
      transactions: [{
        sequenceNumber: 1,
        amount: 250.0,
        currency: 'EUR',
        creditorIban: 'DE89370400440532013000',
        creditorBic: 'COBADEFFXXX',
        creditor: {
          name: 'Müller GmbH',
          postalAddress: { streetName: 'Berliner Allee', buildingNumber: '12', postCode: '10115', townName: 'Berlin', country: 'DE' },
        },
        remittanceInfoUnstructured: 'Rechnung 2026-0099',
      }],
    },
  },
];

describe.each(['v2009', 'v2019'] as const)('XSD validation %s', (version) => {
  it.each(scenarios)('$name is schema-valid', async ({ body }) => {
    const res = await handleGeneratePain001({ ...body, version });
    expect(res.status).toBe(200);

    const result = await validateAgainstXsd(res.body, version);
    expect(formatXsdErrors(result)).toEqual([]);
    expect(result.valid).toBe(true);
  });
});

describe('XSD validation v2009 – unstructured address', () => {
  it('unstructured creditor postal address (AdrLine) is schema-valid', async () => {
    const res = await handleGeneratePain001({
      ...baseBody,
      version: 'v2009',
      transactions: [{
        ...baseBody.transactions[0],
        creditor: { name: 'Recipient GmbH', postalAddress: { country: 'CH', adrLine: ['Bahnhofstrasse 1', '8001 Zürich'] } },
      }],
    });
    expect(res.status).toBe(200);

    const result = await validateAgainstXsd(res.body, 'v2009');
    expect(formatXsdErrors(result)).toEqual([]);
  });
});

describe('XSD validator helper', () => {
  it('reports errors for XML that violates the schema', async () => {
    const req: ResolvedPain001Request = {
      ...baseBody,
      version: 'v2009',
      batchBooking: true,
      nbOfTxs: 1,
      ctrlSum: 100,
    };
    const invalidXml = buildV2009(req).replace(/<MsgId>[^<]*<\/MsgId>/, '');

    const result = await validateAgainstXsd(invalidXml, 'v2009');
    expect(result.valid).toBe(false);
    expect(formatXsdErrors(result).join('\n')).toContain('MsgId');
  });
});
