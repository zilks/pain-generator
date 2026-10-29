import { describe, expect, it, vi } from 'vitest';
import { fileNameFromHeader, generate } from '../src/lib/api';
import { errorsByField, fieldKey } from '../src/lib/errors';
import { buildRequest } from '../src/lib/request';
import { initialState } from '../src/lib/form';

describe('fieldKey / errorsByField', () => {
  it('maps API validation messages to form fields', () => {
    expect(fieldKey('transactions[2].creditorIban "X" is not a valid IBAN.')).toBe('tx.1.iban');
    expect(fieldKey('transactions[1].creditor.postalAddress.postCode is required.')).toBe('tx.0.postCode');
    expect(fieldKey('transactions[1].creditorReference "RF00" is not a valid ISO 11649 creditor reference (RF…).')).toBe('tx.0.reference');
    expect(fieldKey('debtor.iban "X" is not a valid IBAN.')).toBe('debtor.iban');
    expect(fieldKey('executionDate "01.05." does not match the format YYYY-MM-DD.')).toBe('executionDate');
    expect(fieldKey('transactions must be a non-empty array.')).toBeUndefined();
  });

  it('keeps the first message per field', () => {
    const e = errorsByField(['debtor.name is required.', 'debtor.name again', 'testRunId is required (e.g. "VERI-01").']);
    expect(e).toEqual({ 'debtor.name': 'debtor.name is required.', testRunId: 'testRunId is required (e.g. "VERI-01").' });
  });
});

describe('generate', () => {
  const req = buildRequest(initialState('2026-05-01'));

  it('returns the XML and the file name from Content-Disposition', async () => {
    const f = vi.fn().mockResolvedValue(new Response('<xml/>', { status: 200, headers: { 'Content-Disposition': 'attachment; filename="pain001_A_2026-05-01_v2009.xml"' } }));
    const r = await generate(req, f as unknown as typeof fetch);
    expect(r).toEqual({ ok: true, xml: '<xml/>', fileName: 'pain001_A_2026-05-01_v2009.xml' });
    expect(f).toHaveBeenCalledWith('/api/generate-pain001', expect.objectContaining({ method: 'POST' }));
  });

  it('turns a 422 into a list of details', async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Validation error', details: ['a', 'b'] }), { status: 422 }));
    expect(await generate(req, f as unknown as typeof fetch)).toEqual({ ok: false, title: '2 Angaben müssen korrigiert werden', details: ['a', 'b'] });
  });

  it('reports other errors and network failures', async () => {
    const r500 = await generate(req, vi.fn().mockResolvedValue(new Response('', { status: 500 })) as unknown as typeof fetch);
    expect(r500.ok).toBe(false);
    const net = await generate(req, vi.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch);
    expect(net).toMatchObject({ ok: false, title: 'Server nicht erreichbar' });
  });

  it('falls back to a generated file name', () => {
    expect(fileNameFromHeader(null, 'x.xml')).toBe('x.xml');
  });
});
