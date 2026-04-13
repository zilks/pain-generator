// ============================================================
// Calculator – auto-calculation of NbOfTxs & CtrlSum
// ============================================================

import { CreditTransfer } from '../types/pain001.types';

/**
 * Returns the number of transactions.
 * If explicitly provided → use the given value.
 * Otherwise → use the length of the transactions array.
 */
export function resolveNbOfTxs(
  transactions: CreditTransfer[],
  explicitValue?: number
): number {
  if (explicitValue !== undefined) {
    return explicitValue;
  }
  return transactions.length;
}

/**
 * Calculates the control sum (sum of all InstdAmt amounts, 2 decimal places).
 * If explicitly provided → use the given value.
 * Otherwise → sum all transaction.amount values.
 */
export function resolveCtrlSum(
  transactions: CreditTransfer[],
  explicitValue?: number
): number {
  if (explicitValue !== undefined) {
    return explicitValue;
  }
  const sum = transactions.reduce((acc, tx) => acc + tx.amount, 0);
  // Avoid floating-point errors by rounding via string conversion
  return parseFloat(sum.toFixed(2));
}

/**
 * Formats a number as an amount string with exactly 2 decimal places.
 * Example: 1.5 → "1.50", 100 → "100.00"
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}
