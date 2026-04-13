// ============================================================
// ID generator – builds all structured PAIN.001 IDs
// ============================================================

/**
 * Builds the message ID in the format: MSG-{testRunId}-{date}
 * Example: MSG-VERI-01-2025-09-29
 */
export function buildMsgId(testRunId: string, date: string): string {
  return `MSG-${testRunId}-${date}`;
}

/**
 * Builds the payment information ID: PAY-{testRunId}-{date}
 * Example: PAY-VERI-01-2025-09-29
 */
export function buildPmtInfId(testRunId: string, date: string): string {
  return `PAY-${testRunId}-${date}`;
}

/**
 * Builds the instruction ID for a transaction: INS-{testRunId}-{seq}-{date}
 * Example: INS-VERI-01-01-2025-09-29
 */
export function buildInstrId(
  testRunId: string,
  sequenceNumber: number,
  date: string
): string {
  const seq = String(sequenceNumber).padStart(2, '0');
  return `INS-${testRunId}-${seq}-${date}`;
}

/**
 * Builds the end-to-end ID for a transaction: E2E-{testRunId}-{seq}-{date}
 * Example: E2E-VERI-01-01-2025-09-29
 */
export function buildEndToEndId(
  testRunId: string,
  sequenceNumber: number,
  date: string
): string {
  const seq = String(sequenceNumber).padStart(2, '0');
  return `E2E-${testRunId}-${seq}-${date}`;
}
