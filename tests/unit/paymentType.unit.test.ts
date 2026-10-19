import { describe, it, expect } from '@jest/globals';
import { isSepaTransaction, resolvePaymentType } from '../../src/utils/paymentType';
import { validatePain001Request } from '../../src/validation/pain001.validator';
import { CreditTransfer } from '../../src/types/pain001.types';

const tx = (overrides: Partial<CreditTransfer>): CreditTransfer => ({
  sequenceNumber: 1,
  amount: 1.0,
  currency: 'EUR',
  creditorIban: 'DE89370400440532013000',
  creditor: { name: 'Empfänger' },
  ...overrides,
});

describe('isSepaTransaction', () => {
  it('EUR to a SEPA-area IBAN is SEPA', () => {
    expect(isSepaTransaction(tx({}))).toBe(true);
  });

  it('EUR to a Swiss IBAN is SEPA', () => {
    expect(isSepaTransaction(tx({ creditorIban: 'CH5604835012345678009' }))).toBe(true);
  });

  it('non-EUR currency is not SEPA', () => {
    expect(isSepaTransaction(tx({ currency: 'USD' }))).toBe(false);
  });

  it('EUR to a non-SEPA IBAN (GB) is not SEPA', () => {
    expect(isSepaTransaction(tx({ creditorIban: 'GB29NWBK60161331926819' }))).toBe(false);
  });

  it('IBAN with spaces and lowercase country code is handled', () => {
    expect(isSepaTransaction(tx({ creditorIban: 'de89 3704 0044 0532 0130 00' }))).toBe(true);
  });
});

describe('resolvePaymentType', () => {
  it('all SEPA-eligible transactions → SEPA', () => {
    expect(resolvePaymentType([tx({}), tx({ sequenceNumber: 2 })])).toBe('SEPA');
  });

  it('mixed batch → undefined (no PmtTpInf)', () => {
    expect(resolvePaymentType([tx({}), tx({ currency: 'CHF' })])).toBeUndefined();
  });

  it('explicit value overrides the automatic choice', () => {
    expect(resolvePaymentType([tx({ currency: 'USD' })], 'SWIFT')).toBe('SWIFT');
    expect(resolvePaymentType([tx({})], 'SWIFT')).toBe('SWIFT');
  });
});

describe('validatePain001Request – paymentType', () => {
  const base = {
    executionDate: '2025-09-29',
    testRunId: 'VERI-01',
    debtor: { name: 'Test AG', iban: 'CH9300762011623852957' },
    transactions: [tx({})],
  };

  it('accepts SEPA and SWIFT', () => {
    expect(validatePain001Request({ ...base, paymentType: 'SEPA' }).valid).toBe(true);
    expect(validatePain001Request({ ...base, paymentType: 'SWIFT' }).valid).toBe(true);
  });

  it('rejects unknown values', () => {
    const result = validatePain001Request({ ...base, paymentType: 'XYZ' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('paymentType must be "SEPA" or "SWIFT".');
  });

  it('rejects SEPA when a transaction is not EUR', () => {
    const result = validatePain001Request({ ...base, paymentType: 'SEPA', transactions: [tx({ currency: 'USD' })] });
    expect(result.valid).toBe(false);
  });
});
