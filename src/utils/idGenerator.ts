// ============================================================
// ID generator – builds all structured PAIN.001 IDs
// ============================================================

/**
 * Builds the message ID in the format: MSG-{testRunId}-{date}
 * Example: MSG-VERI-01-2025-09-29
 * If randomSuffix is true, a random 6-digit number is appended: MSG-VERI-01-2025-09-29-123456
 */
export function buildMsgId(testRunId: string, date: string, randomSuffix?: boolean): string {
  const base = `MSG-${testRunId}-${date}`;
  if (randomSuffix) {
    const rand = String(Math.floor(100000 + Math.random() * 900000));
    return `${base}-${rand}`;
  }
  return base;
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
