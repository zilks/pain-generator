// ============================================================
// Creditor reference – QR reference (QRR) and ISO 11649 (SCOR)
// ============================================================
// Swiss Payment Standards: if RmtInf/Strd is used, Strd/CdtrRefInf
// with Tp and Ref is mandatory. QR-IBANs require a QR reference,
// all other IBANs use an ISO 11649 creditor reference (RF…).

import type { CreditTransfer, CreditorReferenceType } from '../types/pain001.types';

export interface CreditorReference {
  type: CreditorReferenceType;
  ref: string;
}

const QRR_TABLE = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];

/** Check digit of a QR reference (modulo 10, recursive) */
export function qrrCheckDigit(digits: string): number {
  let carry = 0;
  for (const d of digits) carry = QRR_TABLE[(carry + Number(d)) % 10];
  return (10 - carry) % 10;
}

/** True for a 27-digit QR reference with a valid check digit */
export function isValidQrReference(ref: string): boolean {
  return /^\d{27}$/.test(ref) && qrrCheckDigit(ref.slice(0, 26)) === Number(ref[26]);
}

/** Converts letters to numbers (A=10 … Z=35) and returns the modulo 97 remainder */
function mod97(value: string): number {
  let rest = 0;
  for (const ch of value) {
    const n = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of n) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest;
}

/** True for an ISO 11649 creditor reference (RF + 2 check digits + 1–21 alphanumerics) */
export function isValidScorReference(ref: string): boolean {
  if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(ref)) return false;
  return mod97(ref.slice(4) + ref.slice(0, 4)) === 1;
}

/** Builds an ISO 11649 creditor reference from an alphanumeric base (max. 21 characters) */
export function buildScorReference(base: string): string {
  const body = base.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-21) || '0';
  const check = String(98 - mod97(`${body}RF00`)).padStart(2, '0');
  return `RF${check}${body}`;
}

/** Builds a QR reference from a numeric base (padded / truncated to 26 digits + check digit) */
export function buildQrReference(base: string): string {
  const digits = base.replace(/\D/g, '').slice(-26).padStart(26, '0');
  return `${digits}${qrrCheckDigit(digits)}`;
}

/** QR-IBAN: Swiss/Liechtenstein IBAN whose IID (positions 5–9) lies in 30000–31999 */
export function isQrIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  if (!/^(CH|LI)\d{7}/.test(clean)) return false;
  const iid = Number(clean.slice(4, 9));
  return iid >= 30000 && iid <= 31999;
}

/**
 * Resolves the creditor reference for Strd/CdtrRefInf.
 * Explicit values win; otherwise the type follows the IBAN (QR-IBAN → QRR, else SCOR)
 * and a reference is derived from testRunId and sequence number.
 */
export function resolveCreditorReference(tx: CreditTransfer, testRunId: string): CreditorReference {
  const type: CreditorReferenceType = tx.creditorReferenceType
    ?? (isQrIban(tx.creditorIban) ? 'QRR' : 'SCOR');
  if (tx.creditorReference) {
    return { type, ref: tx.creditorReference.replace(/\s/g, '').toUpperCase() };
  }
  const seq = String(tx.sequenceNumber).padStart(2, '0');
  if (type === 'QRR') {
    // Letters become their numeric value (A=10 … Z=35), like in mod97
    const numeric = testRunId.toUpperCase().replace(/[^A-Z0-9]/g, '')
      .replace(/[A-Z]/g, ch => String(ch.charCodeAt(0) - 55));
    return { type, ref: buildQrReference(`${numeric}${seq}`) };
  }
  return { type, ref: buildScorReference(`${testRunId}${seq}`) };
}
