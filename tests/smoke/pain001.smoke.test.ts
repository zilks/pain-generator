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

const validBodyV2009 = {
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

const validBodyV2019 = {
  executionDate: '2025-09-29',
  testRunId: 'SMOKE-02',
  version: 'v2019',
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

// ── v2009 ──────────────────────────────────────────────────
describe('Smoke Tests – v2009', () => {

  it('returns HTTP 200 and XML content-type', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBodyV2009),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/xml');
  });

  it('response body contains correct v2009 namespace', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBodyV2009),
    });
    const xml = await res.text();
    expect(xml).toContain('<?xml');
    expect(xml).toContain('pain.001.001.03.ch.02');
    expect(xml).toContain('<MsgId>MSG-SMOKE-01-2025-09-29</MsgId>');
  });

  it('Content-Disposition contains correct v2009 filename', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBodyV2009),
    });
    const disposition = res.headers.get('content-disposition') ?? '';
    expect(disposition).toContain('pain001_SMOKE-01_2025-09-29_v2009.xml');
  });

});

// ── v2019 ──────────────────────────────────────────────────
describe('Smoke Tests – v2019', () => {

  it('returns HTTP 200 and XML content-type', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBodyV2019),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/xml');
  });

  it('response body contains correct v2019 namespace', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBodyV2019),
    });
    const xml = await res.text();
    expect(xml).toContain('<?xml');
    expect(xml).toContain('urn:iso:std:iso:20022:tech:xsd:pain.001.001.09');
    expect(xml).toContain('<MsgId>MSG-SMOKE-02-2025-09-29</MsgId>');
  });

  it('Content-Disposition contains correct v2019 filename', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBodyV2019),
    });
    const disposition = res.headers.get('content-disposition') ?? '';
    expect(disposition).toContain('pain001_SMOKE-02_2025-09-29_v2019.xml');
  });

  it('ReqdExctnDt is wrapped in <Dt>', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBodyV2019),
    });
    const xml = await res.text();
    expect(xml).toContain('<Dt>2025-09-29</Dt>');
    expect(xml).not.toContain('<ReqdExctnDt>2025-09-29</ReqdExctnDt>');
  });

});

// ── Allgemein ──────────────────────────────────────────────
describe('Smoke Tests – General', () => {

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

