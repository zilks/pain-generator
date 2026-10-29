import { describe, it, expect } from '@jest/globals';
import {
  buildQrReference,
  buildScorReference,
  isQrIban,
  isValidQrReference,
  isValidScorReference,
  qrrCheckDigit,
  resolveCreditorReference,
} from '../../src/utils/creditorReference';
import { CreditTransfer } from '../../src/types/pain001.types';

const QR_IBAN = 'CH4431999123000889012';
const IBAN = 'CH5604835012345678009';

const tx = (overrides: Partial<CreditTransfer> = {}): CreditTransfer => ({
  sequenceNumber: 1,
  amount: 10,
  currency: 'CHF',
  creditor: { name: 'Empfänger' },
  creditorIban: IBAN,
  ...overrides,
});

describe('QR reference (QRR)', () => {
  it('accepts the SIX sample reference', () => {
    expect(isValidQrReference('210000000003139471430009017')).toBe(true);
  });

  it('rejects a wrong check digit or length', () => {
    expect(isValidQrReference('210000000003139471430009018')).toBe(false);
    expect(isValidQrReference('21000000000313947143000901')).toBe(false);
  });

  it('computes the modulo 10 recursive check digit', () => {
    expect(qrrCheckDigit('21000000000313947143000901')).toBe(7);
  });

  it('pads the base to 26 digits and appends the check digit', () => {
    const ref = buildQrReference('123');
    expect(ref).toHaveLength(27);
    expect(ref.startsWith('00000000000000000000000123')).toBe(true);
    expect(isValidQrReference(ref)).toBe(true);
  });
});

describe('ISO 11649 creditor reference (SCOR)', () => {
  it('accepts a valid RF reference', () => {
    expect(isValidScorReference('RF18539007547034')).toBe(true);
  });

  it('rejects a wrong check sum or format', () => {
    expect(isValidScorReference('RF19539007547034')).toBe(false);
    expect(isValidScorReference('XX18539007547034')).toBe(false);
    expect(isValidScorReference('RF18')).toBe(false);
  });

  it('builds a valid reference from an alphanumeric base', () => {
    const ref = buildScorReference('VERI-01-01');
    expect(ref).toMatch(/^RF\d{2}VERI0101$/);
    expect(isValidScorReference(ref)).toBe(true);
  });

  it('keeps the reference within 25 characters', () => {
    const ref = buildScorReference('A'.repeat(40) + '07');
    expect(ref).toHaveLength(25);
    expect(ref.endsWith('07')).toBe(true);
    expect(isValidScorReference(ref)).toBe(true);
  });
});

describe('isQrIban', () => {
  it('detects QR-IBANs by the IID range 30000–31999', () => {
    expect(isQrIban(QR_IBAN)).toBe(true);
    expect(isQrIban('CH44 3199 9123 0008 8901 2')).toBe(true);
    expect(isQrIban(IBAN)).toBe(false);
    expect(isQrIban('DE89370400440532013000')).toBe(false);
  });
});

describe('resolveCreditorReference', () => {
  it('generates a SCOR reference for a regular IBAN', () => {
    const { type, ref } = resolveCreditorReference(tx({ sequenceNumber: 2 }), 'VERI-01');
    expect(type).toBe('SCOR');
    expect(ref).toMatch(/^RF\d{2}VERI0102$/);
    expect(isValidScorReference(ref)).toBe(true);
  });

  it('generates a QR reference for a QR-IBAN', () => {
    const { type, ref } = resolveCreditorReference(tx({ creditorIban: QR_IBAN }), 'VERI-01');
    expect(type).toBe('QRR');
    expect(isValidQrReference(ref)).toBe(true);
  });

  it('uses an explicit reference and type', () => {
    expect(resolveCreditorReference(tx({ creditorReference: 'rf18 5390 0754 7034' }), 'X'))
      .toEqual({ type: 'SCOR', ref: 'RF18539007547034' });
    expect(resolveCreditorReference(
      tx({ creditorIban: QR_IBAN, creditorReference: '21 00000 00003 13947 14300 09017', creditorReferenceType: 'QRR' }), 'X'))
      .toEqual({ type: 'QRR', ref: '210000000003139471430009017' });
  });
});
