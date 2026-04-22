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

  // ── Swagger-Beispiel: v2009 – strukturierte Adresse (AdrTp=STRD) ──
  it('v2009 strukturierte Adresse – HTTP 200, AdrTp=STRD und Adressfelder im XML', async () => {
    const body = {
      executionDate: '2025-09-29',
      testRunId: 'VERI-05',
      version: 'v2009',
      randomMsgId: false,
      debtor: { name: 'Muster AG', iban: 'CH9300762011623852957' },
      transactions: [
        {
          sequenceNumber: 1,
          amount: 100.00,
          currency: 'CHF',
          creditorIban: 'CH5604835012345678009',
          creditor: {
            name: 'Empfänger GmbH',
            postalAddress: {
              streetName: 'Hauptstrasse',
              buildingNumber: '1',
              postCode: '4001',
              townName: 'Basel',
              country: 'CH',
            },
          },
        },
      ],
    };
    const res = await handleGeneratePain001(body);
    expect(res.status).toBe(200);
    expect(res.body).toContain('http://www.six-interbank-clearing.com/de/pain.001.001.03.ch.02.xsd');
    expect(res.body).toContain('<AdrTp>STRD</AdrTp>');
    expect(res.body).toContain('<StrtNm>Hauptstrasse</StrtNm>');
    expect(res.body).toContain('<BldgNb>1</BldgNb>');
    expect(res.body).toContain('<PstCd>4001</PstCd>');
    expect(res.body).toContain('<TwnNm>Basel</TwnNm>');
    expect(res.body).toContain('<Ctry>CH</Ctry>');
    expect(res.body).not.toContain('<AdrLine>');
  });

  // ── Swagger-Beispiel: v2009 – unstrukturierte Adresse (AdrTp=ADDR) ──
  it('v2009 unstrukturierte Adresse – HTTP 200, AdrTp=ADDR und AdrLine im XML', async () => {
    const body = {
      executionDate: '2025-09-29',
      testRunId: 'VERI-06',
      version: 'v2009',
      randomMsgId: false,
      debtor: { name: 'Muster AG', iban: 'CH9300762011623852957' },
      transactions: [
        {
          sequenceNumber: 1,
          amount: 100.00,
          currency: 'CHF',
          creditorIban: 'CH5604835012345678009',
          creditor: {
            name: 'Empfänger GmbH',
            postalAddress: {
              adrLine: ['Hauptstrasse 1', '4001 Basel'],
              country: 'CH',
            },
          },
        },
      ],
    };
    const res = await handleGeneratePain001(body);
    expect(res.status).toBe(200);
    expect(res.body).toContain('http://www.six-interbank-clearing.com/de/pain.001.001.03.ch.02.xsd');
    expect(res.body).toContain('<AdrTp>ADDR</AdrTp>');
    expect(res.body).toContain('<AdrLine>Hauptstrasse 1</AdrLine>');
    expect(res.body).toContain('<AdrLine>4001 Basel</AdrLine>');
    expect(res.body).toContain('<Ctry>CH</Ctry>');
    expect(res.body).not.toContain('<StrtNm>');
    expect(res.body).not.toContain('<AdrTp>STRD</AdrTp>');
  });

  // ── Swagger-Beispiel: v2019 – strukturierte Adresse ──
  it('v2019 strukturierte Adresse – HTTP 200, kein AdrTp, direkte Adressfelder im XML', async () => {
    const body = {
      executionDate: '2025-09-29',
      testRunId: 'VERI-07',
      version: 'v2019',
      randomMsgId: false,
      debtor: { name: 'Muster AG', iban: 'CH9300762011623852957', bic: 'BANKCH22XXX' },
      transactions: [
        {
          sequenceNumber: 1,
          amount: 100.00,
          currency: 'CHF',
          creditorIban: 'CH5604835012345678009',
          creditorIid: '769',
          creditor: {
            name: 'Empfänger GmbH',
            postalAddress: {
              streetName: 'Hauptstrasse',
              buildingNumber: '1',
              postCode: '4001',
              townName: 'Basel',
              country: 'CH',
            },
          },
        },
      ],
    };
    const res = await handleGeneratePain001(body);
    expect(res.status).toBe(200);
    expect(res.body).toContain('urn:iso:std:iso:20022:tech:xsd:pain.001.001.09');
    expect(res.body).not.toContain('<AdrTp>');
    expect(res.body).toContain('<StrtNm>Hauptstrasse</StrtNm>');
    expect(res.body).toContain('<BldgNb>1</BldgNb>');
    expect(res.body).toContain('<PstCd>4001</PstCd>');
    expect(res.body).toContain('<TwnNm>Basel</TwnNm>');
    expect(res.body).toContain('<Ctry>CH</Ctry>');
    expect(res.body).not.toContain('<AdrLine>');
  });

  // ── Swagger-Beispiel: v2019 – ohne Adresse ──
  it('v2019 ohne Adresse – HTTP 200, kein PstlAdr-Block im XML', async () => {
    const body = {
      executionDate: '2025-09-29',
      testRunId: 'VERI-08',
      version: 'v2019',
      randomMsgId: false,
      debtor: { name: 'Muster AG', iban: 'CH9300762011623852957', bic: 'BANKCH22XXX' },
      transactions: [
        {
          sequenceNumber: 1,
          amount: 100.00,
          currency: 'CHF',
          creditorIban: 'CH5604835012345678009',
          creditor: { name: 'Empfänger GmbH' },
        },
      ],
    };
    const res = await handleGeneratePain001(body);
    expect(res.status).toBe(200);
    expect(res.body).toContain('urn:iso:std:iso:20022:tech:xsd:pain.001.001.09');
    expect(res.body).toContain('<Nm>Empfänger GmbH</Nm>');
    expect(res.body).not.toContain('<PstlAdr>');
    expect(res.body).not.toContain('<AdrTp>');
  });

  // ── Zahlungsarten: SEPA vs. Bankzahlung Ausland ──────────
  it('SEPA v2019 – HTTP 200, EUR, DE-IBAN, BICFI korrekt im XML', async () => {
    const body = {
      executionDate: '2026-05-01',
      testRunId: 'SEPA-01',
      version: 'v2019',
      randomMsgId: false,
      debtor: { name: 'Muster AG', iban: 'CH5604835012345678009', bic: 'CRESCHZZ80A' },
      transactions: [{
        sequenceNumber: 1,
        amount: 250.00,
        currency: 'EUR',
        creditorIban: 'DE89370400440532013000',
        creditorBic: 'COBADEFFXXX',
        creditor: {
          name: 'Müller GmbH',
          postalAddress: {
            streetName: 'Berliner Allee',
            buildingNumber: '12',
            postCode: '10115',
            townName: 'Berlin',
            country: 'DE',
          },
        },
        remittanceInfoUnstructured: 'Rechnung 2026-0099',
      }],
    };
    const res = await handleGeneratePain001(body);
    expect(res.status).toBe(200);
    expect(res.body).toContain('urn:iso:std:iso:20022:tech:xsd:pain.001.001.09');
    expect(res.body).toContain('Ccy="EUR"');
    expect(res.body).toContain('<IBAN>DE89370400440532013000</IBAN>');
    expect(res.body).toContain('<BICFI>COBADEFFXXX</BICFI>');
    expect(res.body).toContain('<Ctry>DE</Ctry>');
    expect(res.body).toContain('<Ustrd>Rechnung 2026-0099</Ustrd>');
    // PmtTpInf noch nicht implementiert – kein SvcLvl erwartet
    expect(res.body).not.toContain('<PmtTpInf>');
    expect(res.body).not.toContain('<SvcLvl>');
  });

  it('SEPA v2019 – Content-Disposition enthält korrekten Dateinamen', async () => {
    const body = {
      executionDate: '2026-05-01',
      testRunId: 'SEPA-01',
      version: 'v2019',
      debtor: { name: 'Muster AG', iban: 'CH5604835012345678009', bic: 'CRESCHZZ80A' },
      transactions: [{
        sequenceNumber: 1, amount: 250.00, currency: 'EUR',
        creditorIban: 'DE89370400440532013000', creditorBic: 'COBADEFFXXX',
        creditor: { name: 'Müller GmbH' },
      }],
    };
    const res = await handleGeneratePain001(body);
    expect(res.headers['Content-Disposition']).toContain('pain001_SEPA-01_2026-05-01_v2019.xml');
  });

  it('Bankzahlung Ausland v2019 – HTTP 200, USD, US-Adresse, SWIFT-BIC korrekt im XML', async () => {
    const body = {
      executionDate: '2026-05-01',
      testRunId: 'AUSLAND-01',
      version: 'v2019',
      randomMsgId: false,
      debtor: { name: 'Muster AG', iban: 'CH5604835012345678009', bic: 'CRESCHZZ80A' },
      transactions: [{
        sequenceNumber: 1,
        amount: 1000.00,
        currency: 'USD',
        creditorIban: 'DE89370400440532013000',
        creditorBic: 'CHASUS33XXX',
        creditor: {
          name: 'Acme Corp',
          postalAddress: {
            streetName: '5th Avenue',
            buildingNumber: '350',
            postCode: '10001',
            townName: 'New York',
            country: 'US',
          },
        },
        remittanceInfoUnstructured: 'Invoice 2026-0099',
      }],
    };
    const res = await handleGeneratePain001(body);
    expect(res.status).toBe(200);
    expect(res.body).toContain('urn:iso:std:iso:20022:tech:xsd:pain.001.001.09');
    expect(res.body).toContain('Ccy="USD"');
    expect(res.body).toContain('<BICFI>CHASUS33XXX</BICFI>');
    expect(res.body).toContain('<Ctry>US</Ctry>');
    expect(res.body).toContain('<TwnNm>New York</TwnNm>');
    expect(res.body).toContain('<Ustrd>Invoice 2026-0099</Ustrd>');
    // PmtTpInf noch nicht implementiert
    expect(res.body).not.toContain('<PmtTpInf>');
    expect(res.body).not.toContain('<SvcLvl>');
  });

  it('Bankzahlung Ausland v2019 – NbOfTxs und CtrlSum werden korrekt berechnet', async () => {
    const body = {
      executionDate: '2026-05-01',
      testRunId: 'AUSLAND-02',
      version: 'v2019',
      debtor: { name: 'Muster AG', iban: 'CH5604835012345678009', bic: 'CRESCHZZ80A' },
      transactions: [
        { sequenceNumber: 1, amount: 500.00, currency: 'USD', creditorIban: 'DE89370400440532013000', creditorBic: 'CHASUS33XXX', creditor: { name: 'Acme Corp' } },
        { sequenceNumber: 2, amount: 750.00, currency: 'USD', creditorIban: 'DE89370400440532013000', creditorBic: 'CHASUS33XXX', creditor: { name: 'Globex Ltd' } },
      ],
    };
    const res = await handleGeneratePain001(body);
    expect(res.status).toBe(200);
    expect(res.body).toContain('<NbOfTxs>2</NbOfTxs>');
    expect(res.body).toContain('<CtrlSum>1250.00</CtrlSum>');
  });

  it('SEPA und Ausland gemischt – beide Währungen EUR und USD im selben File', async () => {
    const body = {
      executionDate: '2026-05-01',
      testRunId: 'MIXED-01',
      version: 'v2019',
      debtor: { name: 'Muster AG', iban: 'CH5604835012345678009', bic: 'CRESCHZZ80A' },
      transactions: [
        { sequenceNumber: 1, amount: 250.00, currency: 'EUR', creditorIban: 'DE89370400440532013000', creditorBic: 'COBADEFFXXX', creditor: { name: 'Müller GmbH' } },
        { sequenceNumber: 2, amount: 1000.00, currency: 'USD', creditorIban: 'DE89370400440532013000', creditorBic: 'CHASUS33XXX', creditor: { name: 'Acme Corp' } },
      ],
    };
    const res = await handleGeneratePain001(body);
    expect(res.status).toBe(200);
    expect(res.body).toContain('Ccy="EUR"');
    expect(res.body).toContain('Ccy="USD"');
    expect(res.body).toContain('<NbOfTxs>2</NbOfTxs>');
    expect(res.body).toContain('<CtrlSum>1250.00</CtrlSum>');
  });
});

