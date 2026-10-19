// ============================================================
// Payment type – resolves PmtInf/PmtTpInf (SEPA vs. SWIFT)
// ============================================================

import { CreditTransfer, PaymentType } from '../types/pain001.types';

/** Countries of the SEPA payment scheme (EU/EEA, Switzerland, Monaco, San Marino, Vatican) */
const SEPA_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'CH', 'MC', 'SM', 'VA',
]);

/** True if the transaction can be sent as SEPA Credit Transfer (EUR and SEPA-area IBAN) */
export function isSepaTransaction(tx: CreditTransfer): boolean {
  const country = tx.creditorIban.replace(/\s/g, '').slice(0, 2).toUpperCase();
  return tx.currency === 'EUR' && SEPA_COUNTRIES.has(country);
}

/**
 * Returns the explicit payment type if given, otherwise SEPA when all
 * transactions are SEPA-eligible. Returns undefined for other batches, so
 * no PmtTpInf is generated and the bank derives the type itself.
 */
export function resolvePaymentType(
  transactions: CreditTransfer[],
  explicitValue?: PaymentType
): PaymentType | undefined {
  if (explicitValue !== undefined) {
    return explicitValue;
  }
  return transactions.every(isSepaTransaction) ? 'SEPA' : undefined;
}
