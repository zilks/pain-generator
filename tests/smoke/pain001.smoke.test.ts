import { describe, it, expect } from '@jest/globals';

// ─────────────────────────────────────────────────────────────
// Smoke Tests – run against the live service after deployment.
// Default URL: https://pain-generator.onrender.com
//
// Override via environment variable:
//   SERVICE_URL=https://other-env.onrender.com npm run test:smoke
// ─────────────────────────────────────────────────────────────

const BASE_URL = (process.env.SERVICE_URL ?? 'https://pain-generator.onrender.com').replace(/\/$/, '');

const ENDPOINT = `${BASE_URL}/api/generate-pain001`;

const validBody = {
  executionDate: '2025-09-29',
  testRunId: 'SMOKE-01',
  version: 'v2009',
  debtor: {
    name: 'Smoke Test AG',
    iban: 'CH9300762011623852957',
    bic: 'BANKCH22XXX',
  },
  transactions: [
    {
      sequenceNumber: 1,
      amount: 1.00,
      currency: 'CHF',
      creditorIban: 'CH5604835012345678009',
      creditor: { name: 'Smoke Recipient GmbH' },
    },
  ],
};

describe('Smoke Tests – POST /api/generate-pain001', () => {

  it('returns HTTP 200 and XML content-type', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/xml');
  });

  it('response body contains valid XML with correct namespace', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    const xml = await res.text();
    expect(xml).toContain('<?xml');
    expect(xml).toContain('pain.001.001.03.ch.02');
    expect(xml).toContain('<MsgId>MSG-SMOKE-01-2025-09-29</MsgId>');
  });

  it('Content-Disposition header contains the correct filename', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    const disposition = res.headers.get('content-disposition') ?? '';
    expect(disposition).toContain('pain001_SMOKE-01_2025-09-29_v2009.xml');
  });

  it('invalid request returns HTTP 422', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executionDate: 'INVALID' }),
    });

    expect(res.status).toBe(422);
    const json = await res.json() as { error: string };
    expect(json.error).toBe('Validation error');
  });

  it('Swagger UI is reachable (GET /api returns HTTP 200)', async () => {
    const res = await fetch(`${BASE_URL}/api`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('swagger');
  });

});

