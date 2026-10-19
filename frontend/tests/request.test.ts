import { describe, expect, it } from 'vitest';
import { emptyTransaction, formatAmount, initialState, parseAmount, totalAmount, withVersion } from '../src/lib/form';
import { buildRequest } from '../src/lib/request';

describe('buildRequest', () => {
  it('sends only required fields for the default state', () => {
    const req = buildRequest(initialState('2026-05-01'));
    expect(req).toEqual({
      version: 'v2009',
      testRunId: 'TEST-01',
      executionDate: '2026-05-01',
      batchBooking: true,
      debtor: { name: 'Muster AG', iban: 'CH56 0483 5012 3456 7800 9' },
      transactions: [
        {
          sequenceNumber: 1,
          amount: 1,
          currency: 'CHF',
          creditor: { name: 'Max Mustermann' },
          creditorIban: 'CH93 0076 2011 6238 5295 7',
          remittanceInfoUnstructured: 'Testzahlung',
        },
      ],
    });
  });

  it('adds structured and unstructured addresses only when selected', () => {
    const s = initialState('2026-05-01');
    s.transactions[0] = { ...s.transactions[0], address: 'structured', street: 'Hauptstrasse', buildingNumber: '1', postCode: '4001', town: 'Basel' };
    expect(buildRequest(s).transactions[0].creditor.postalAddress).toEqual({
      streetName: 'Hauptstrasse', buildingNumber: '1', postCode: '4001', townName: 'Basel', country: 'CH',
    });

    s.transactions[0] = { ...s.transactions[0], address: 'unstructured', line1: 'Hauptstrasse 1', line2: '' };
    expect(buildRequest(s).transactions[0].creditor.postalAddress).toEqual({ adrLine: ['Hauptstrasse 1'], country: 'CH' });
  });

  it('maps agent and remittance choices to the matching API fields', () => {
    const s = initialState('2026-05-01');
    s.transactions[0] = { ...s.transactions[0], agent: 'iid', iid: '4835', bic: 'IGNORED', remittance: 'structured', remittanceText: 'Info' };
    const tx = buildRequest(s).transactions[0];
    expect(tx.creditorIid).toBe('4835');
    expect(tx).not.toHaveProperty('creditorBic');
    expect(tx.remittanceInfoStructured).toBe('Info');
    expect(tx).not.toHaveProperty('remittanceInfoUnstructured');
  });

  it('adds file options only when switched on', () => {
    const s = initialState('2026-05-01');
    s.options = { batchBooking: false, randomMsgId: true, creationDateTime: true, initiatingPartyName: true };
    s.creationDateTime = '2026-05-01T08:00:00';
    s.initiatingPartyName = 'Holding AG';
    s.debtor = { ...s.debtor, agent: 'bic', bic: 'CRESCHZZ80A' };
    const req = buildRequest(s);
    expect(req).toMatchObject({ batchBooking: false, randomMsgId: true, creationDateTime: '2026-05-01T08:00:00', initiatingPartyName: 'Holding AG' });
    expect(req.debtor.bic).toBe('CRESCHZZ80A');
  });

  it('numbers transactions by position', () => {
    const s = initialState('2026-05-01');
    s.transactions.push(emptyTransaction());
    expect(buildRequest(s).transactions.map((t) => t.sequenceNumber)).toEqual([1, 2]);
  });
});

describe('form helpers', () => {
  it('falls back from unstructured address when switching to v2019', () => {
    const s = initialState();
    s.transactions[0].address = 'unstructured';
    expect(withVersion(s, 'v2019').transactions[0].address).toBe('structured');
    expect(withVersion(s, 'v2009').transactions[0].address).toBe('unstructured');
  });

  it('parses and formats amounts', () => {
    expect(parseAmount("1'500,50")).toBe(1500.5);
    expect(parseAmount('abc')).toBe(0);
    expect(formatAmount(2250.5)).toBe("2'250.50");
  });

  it('sums all transactions', () => {
    const s = initialState();
    s.transactions.push({ ...emptyTransaction(), amount: '2.50' });
    expect(totalAmount(s)).toBe(3.5);
  });
});
