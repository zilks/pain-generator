import { describe, it, expect } from '@jest/globals';
import { handleGeneratePain001 } from '../../src/pain001.handler';

// ─────────────────────────────────────────────────────────────
// Handler (framework-agnostic)
// Tests the interaction between validator, calculator and builder.
// ─────────────────────────────────────────────────────────────
describe('handleGeneratePain001', () => {
  const validBody = {
    executionDate: '2025-09-29',
    testRunId: 'VERI-01',
    debtor: { name: 'Test AG', iban: 'CH9300762011623852957' },
    transactions: [
      { sequenceNumber: 1, amount: 100.00, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'Recipient GmbH' } },
    ],
  };

  it('valid v2009 request returns HTTP 200 with XML', async () => {
    const res = await handleGeneratePain001({ ...validBody, version: 'v2009' });
    expect(res.status).toBe(200);
    expect(res.headers['Content-Type']).toContain('application/xml');
    expect(res.body).toContain('<?xml');
    expect(res.body).toContain('<MsgId>MSG-VERI-01-2025-09-29</MsgId>');
  });

  it('Content-Disposition contains correct filename', async () => {
    const res = await handleGeneratePain001({ ...validBody, version: 'v2009' });
    expect(res.headers['Content-Disposition']).toContain('pain001_VERI-01_2025-09-29_v2009.xml');
  });

  it('invalid request returns HTTP 422 with error list', async () => {
    const res = await handleGeneratePain001({ executionDate: 'INVALID' });
    expect(res.status).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Validation error');
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
  });

  it('version v2019 returns HTTP 501 Not Implemented', async () => {
    const res = await handleGeneratePain001({ ...validBody, version: 'v2019' });
    expect(res.status).toBe(501);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Not implemented');
  });

  it('version defaults to v2009 when not specified', async () => {
    const res = await handleGeneratePain001(validBody);
    expect(res.status).toBe(200);
    expect(res.headers['Content-Disposition']).toContain('v2009');
  });

  it('creationDateTime is auto-set when not provided', async () => {
    const res = await handleGeneratePain001(validBody);
    expect(res.status).toBe(200);
    expect(res.body).toContain(String(new Date().getFullYear()));
  });
});

