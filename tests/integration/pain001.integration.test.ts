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

  it('valid v2019 request returns HTTP 200 with XML', async () => {
    const res = await handleGeneratePain001({ ...validBody, version: 'v2019' });
    expect(res.status).toBe(200);
    expect(res.headers['Content-Type']).toContain('application/xml');
    expect(res.body).toContain('urn:iso:std:iso:20022:tech:xsd:pain.001.001.09');
    expect(res.body).toContain('<?xml');
  });

  it('v2019 Content-Disposition contains correct filename', async () => {
    const res = await handleGeneratePain001({ ...validBody, version: 'v2019' });
    expect(res.headers['Content-Disposition']).toContain('pain001_VERI-01_2025-09-29_v2019.xml');
  });

  it('v2019 NbOfTxs and CtrlSum are auto-calculated', async () => {
    const body = {
      ...validBody,
      version: 'v2019',
      transactions: [
        { sequenceNumber: 1, amount: 1.50, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'A' } },
        { sequenceNumber: 2, amount: 2.50, currency: 'CHF', creditorIban: 'CH9300762011623852957', creditor: { name: 'B' } },
      ],
    };
    const res = await handleGeneratePain001(body);
    expect(res.status).toBe(200);
    expect(res.body).toContain('<NbOfTxs>2</NbOfTxs>');
    expect(res.body).toContain('<CtrlSum>4.00</CtrlSum>');
  });

  it('v2019 ReqdExctnDt is wrapped in <Dt>', async () => {
    const res = await handleGeneratePain001({ ...validBody, version: 'v2019' });
    expect(res.body).toContain('<Dt>2025-09-29</Dt>');
    expect(res.body).not.toContain('<ReqdExctnDt>2025-09-29</ReqdExctnDt>');
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

