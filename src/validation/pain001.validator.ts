// ============================================================
// Validator – input validation for Pain001Request
// ============================================================

import { isValidIBAN } from 'ibantools';
import { Pain001Request, CreditTransfer } from '../types/pain001.types';
import { isSepaTransaction } from '../utils/paymentType';
import { isQrIban, isValidQrReference, isValidScorReference } from '../utils/creditorReference';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const COUNTRY_REGEX = /^[A-Z]{2}$/;

export function validatePain001Request(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  const req = body as Record<string, unknown>;

  // ── Required fields ──────────────────────────────────────
  if (!req.executionDate || typeof req.executionDate !== 'string') {
    errors.push('executionDate is required (format: YYYY-MM-DD).');
  } else if (!DATE_REGEX.test(req.executionDate)) {
    errors.push(`executionDate "${req.executionDate}" does not match the format YYYY-MM-DD.`);
  }

  if (!req.testRunId || typeof req.testRunId !== 'string' || req.testRunId.trim() === '') {
    errors.push('testRunId is required (e.g. "VERI-01").');
  }

  // ── Optional fields ──────────────────────────────────────
  if (req.creationDateTime !== undefined) {
    if (typeof req.creationDateTime !== 'string' || !DATETIME_REGEX.test(req.creationDateTime)) {
      errors.push('creationDateTime must match the format YYYY-MM-DDTHH:MM:SS (e.g. "2025-09-29T11:11:11").');
    }
  }

  if (req.version !== undefined && req.version !== 'v2009' && req.version !== 'v2019') {
    errors.push('version must be "v2009" or "v2019".');
  }

  if (req.paymentType !== undefined && req.paymentType !== 'SEPA' && req.paymentType !== 'SWIFT') {
    errors.push('paymentType must be "SEPA" or "SWIFT".');
  }

  if (req.nbOfTxs !== undefined && (typeof req.nbOfTxs !== 'number' || req.nbOfTxs < 1)) {
    errors.push('nbOfTxs must be a positive integer.');
  }

  if (req.ctrlSum !== undefined && (typeof req.ctrlSum !== 'number' || req.ctrlSum <= 0)) {
    errors.push('ctrlSum must be a positive number.');
  }

  // ── Debtor ───────────────────────────────────────────────
  if (!req.debtor || typeof req.debtor !== 'object') {
    errors.push('debtor is required.');
  } else {
    const debtor = req.debtor as Record<string, unknown>;
    if (!debtor.name || typeof debtor.name !== 'string' || debtor.name.trim() === '') {
      errors.push('debtor.name is required.');
    }
    if (!debtor.iban || typeof debtor.iban !== 'string') {
      errors.push('debtor.iban is required.');
    } else if (!isValidIBAN(debtor.iban.replace(/\s/g, ''))) {
      errors.push(`debtor.iban "${debtor.iban}" is not a valid IBAN.`);
    }
  }

  // ── Transactions ─────────────────────────────────────────
  if (!Array.isArray(req.transactions) || req.transactions.length === 0) {
    errors.push('transactions must be a non-empty array.');
  } else {
    (req.transactions as unknown[]).forEach((tx, idx) => {
      const txErrors = validateTransaction(tx, idx + 1);
      errors.push(...txErrors);
    });

    if (req.paymentType === 'SEPA') {
      const allSepa = (req.transactions as Record<string, unknown>[]).every(
        (t) => typeof t?.currency === 'string' && typeof t.creditorIban === 'string'
          && isSepaTransaction(t as unknown as CreditTransfer)
      );
      if (!allSepa) {
        errors.push('paymentType "SEPA" requires EUR and a creditorIban in the SEPA area for every transaction.');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateTransaction(tx: unknown, idx: number): string[] {
  const errors: string[] = [];
  const prefix = `transactions[${idx}]`;

  if (!tx || typeof tx !== 'object') {
    errors.push(`${prefix} must be an object.`);
    return errors;
  }

  const t = tx as Record<string, unknown>;

  if (typeof t.sequenceNumber !== 'number' || t.sequenceNumber < 1) {
    errors.push(`${prefix}.sequenceNumber must be a positive integer.`);
  }

  if (typeof t.amount !== 'number' || t.amount <= 0) {
    errors.push(`${prefix}.amount must be a positive number.`);
  }

  if (!t.currency || typeof t.currency !== 'string' || t.currency.trim().length !== 3) {
    errors.push(`${prefix}.currency must be a 3-character ISO-4217 code (e.g. "CHF").`);
  }

  if (!t.creditorIban || typeof t.creditorIban !== 'string') {
    errors.push(`${prefix}.creditorIban is required.`);
  } else if (!isValidIBAN((t.creditorIban as string).replace(/\s/g, ''))) {
    errors.push(`${prefix}.creditorIban "${t.creditorIban}" is not a valid IBAN.`);
  }

  errors.push(...validateCreditorReference(t, prefix));

  if (!t.creditor || typeof t.creditor !== 'object') {
    errors.push(`${prefix}.creditor is required.`);
  } else {
    const c = t.creditor as Record<string, unknown>;
    if (!c.name || typeof c.name !== 'string' || c.name.trim() === '') {
      errors.push(`${prefix}.creditor.name is required.`);
    }
    if (c.postalAddress !== undefined) {
      const pa = c.postalAddress as Record<string, unknown>;
      const hasAdrLine = Array.isArray(pa.adrLine) && (pa.adrLine as unknown[]).length > 0;
      if (!hasAdrLine) {
        // Strukturierte Adresse: Felder sind Pflicht
        if (!pa.streetName || typeof pa.streetName !== 'string') {
          errors.push(`${prefix}.creditor.postalAddress.streetName is required.`);
        }
        if (!pa.postCode || typeof pa.postCode !== 'string') {
          errors.push(`${prefix}.creditor.postalAddress.postCode is required.`);
        }
        if (!pa.townName || typeof pa.townName !== 'string') {
          errors.push(`${prefix}.creditor.postalAddress.townName is required.`);
        }
      }
      if (!pa.country || typeof pa.country !== 'string' || !COUNTRY_REGEX.test(pa.country as string)) {
        errors.push(`${prefix}.creditor.postalAddress.country must be a 2-character ISO-3166-1 alpha-2 code (e.g. "CH").`);
      }
    }
  }

  return errors;
}

function validateCreditorReference(t: Record<string, unknown>, prefix: string): string[] {
  const errors: string[] = [];
  const type = t.creditorReferenceType;
  if (type !== undefined && type !== 'QRR' && type !== 'SCOR') {
    errors.push(`${prefix}.creditorReferenceType must be "QRR" or "SCOR".`);
    return errors;
  }

  const iban = typeof t.creditorIban === 'string' ? t.creditorIban : '';
  const qrIban = isQrIban(iban);
  if (type === 'QRR' && iban && !qrIban) {
    errors.push(`${prefix}.creditorReferenceType "QRR" requires a QR-IBAN as creditorIban.`);
  }
  if (type === 'SCOR' && qrIban) {
    errors.push(`${prefix}.creditorReferenceType "SCOR" is not allowed with a QR-IBAN (use "QRR").`);
  }

  if (t.creditorReference !== undefined) {
    if (typeof t.creditorReference !== 'string' || t.creditorReference.trim() === '') {
      errors.push(`${prefix}.creditorReference must be a non-empty string.`);
      return errors;
    }
    const ref = t.creditorReference.replace(/\s/g, '').toUpperCase();
    const effectiveType = type ?? (qrIban ? 'QRR' : 'SCOR');
    if (effectiveType === 'QRR' && !isValidQrReference(ref)) {
      errors.push(`${prefix}.creditorReference "${t.creditorReference}" is not a valid QR reference (27 digits, modulo 10 recursive).`);
    }
    if (effectiveType === 'SCOR' && !isValidScorReference(ref)) {
      errors.push(`${prefix}.creditorReference "${t.creditorReference}" is not a valid ISO 11649 creditor reference (RF…).`);
    }
  }
  return errors;
}
