// ============================================================
// Use-Case-Beispiele aus docs/examples – stellen sicher, dass die
// Dokumentation (docs/use-cases.md) mit dem Generator übereinstimmt.
// ============================================================

import { describe, it, expect, jest, beforeAll } from '@jest/globals';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { handleGeneratePain001 } from '../../src/pain001.handler';
import { validateAgainstXsd, formatXsdErrors } from '../helpers/xsdValidator';

const EXAMPLES_DIR = join(__dirname, '../../docs/examples');

/** Erwartete XML-Fragmente pro Beispiel (Leerzeichen werden vor dem Vergleich entfernt) */
const EXPECTED: Record<string, { contains: string[]; notContains?: string[] }> = {
  'uc01-minimal-v2009.json': {
    contains: ['pain.001.001.03.ch.02.xsd', '<ReqdExctnDt>2026-05-01</ReqdExctnDt>', '<NbOfTxs>1</NbOfTxs>'],
  },
  'uc02-minimal-v2019.json': {
    contains: ['urn:iso:std:iso:20022:tech:xsd:pain.001.001.09', '<ReqdExctnDt><Dt>2026-05-01</Dt></ReqdExctnDt>'],
    notContains: ['<CdtrAgt>'],
  },
  'uc03-adresse-strukturiert.json': {
    contains: ['<BICFI>CRESCHZZ80A</BICFI>', '<PstlAdr><StrtNm>Hauptstrasse</StrtNm><BldgNb>1</BldgNb><PstCd>4001</PstCd><TwnNm>Basel</TwnNm><Ctry>CH</Ctry></PstlAdr>'],
    notContains: ['<AdrTp>'],
  },
  'uc04-adresse-unstrukturiert-v2009.json': {
    contains: ['<BIC>CRESCHZZ80A</BIC>', '<PstlAdr><AdrTp>ADDR</AdrTp><Ctry>CH</Ctry><AdrLine>Hauptstrasse1</AdrLine><AdrLine>4001Basel</AdrLine></PstlAdr>'],
  },
  'uc05-iid-clearing.json': {
    contains: [
      '<DbtrAgt><FinInstnId><ClrSysMmbId><ClrSysId><Cd>CHBCC</Cd></ClrSysId><MmbId>762</MmbId>',
      '<CdtrAgt><FinInstnId><ClrSysMmbId><ClrSysId><Cd>CHBCC</Cd></ClrSysId><MmbId>4835</MmbId>',
    ],
  },
  'uc06-verwendungszweck.json': {
    contains: [
      '<RmtInf><Ustrd>Rechnung2026-0042</Ustrd></RmtInf>',
      '<RmtInf><Strd><AddtlRmtInf>ZusatzinfozurZahlung</AddtlRmtInf></Strd></RmtInf>',
      '<RmtInf><Ustrd>Rechnung2026-0043</Ustrd><Strd><AddtlRmtInf>ZusatzinfozurZahlung</AddtlRmtInf></Strd></RmtInf>',
    ],
  },
  'uc07-mehrere-transaktionen.json': {
    contains: ['<NbOfTxs>3</NbOfTxs>', '<CtrlSum>60.60</CtrlSum>', '<EndToEndId>E2E-UC07-03-2026-05-01</EndToEndId>'],
  },
  'uc08-eindeutige-msgid.json': {
    contains: [],
  },
  'uc09-einzelbuchung.json': {
    contains: ['<BtchBookg>false</BtchBookg>', '<CreDtTm>2026-04-30T08:00:00</CreDtTm>', '<InitgPty><Nm>TreuhandMusterGmbH</Nm></InitgPty>'],
  },
  'uc10-negativtest-kontrollsumme.json': {
    contains: ['<NbOfTxs>3</NbOfTxs>', '<CtrlSum>999.99</CtrlSum>'],
  },
  'uc11-eur-sepa-raum.json': {
    contains: ['<InstdAmtCcy="EUR">250.00</InstdAmt>', '<BICFI>COBADEFFXXX</BICFI>', '<IBAN>DE89370400440532013000</IBAN>'],
    notContains: ['<PmtTpInf>'],
  },
};

const compact = (xml: string) => xml.replace(/\s+/g, '');

describe('docs/examples – Use-Case-Beispiele', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  const files = readdirSync(EXAMPLES_DIR).filter(f => f.endsWith('.json')).sort();

  it('jedes Beispiel hat erwartete Ergebnisse (und umgekehrt)', () => {
    expect(files).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(files)('%s generiert gültiges XML', async (file) => {
    const body = JSON.parse(readFileSync(join(EXAMPLES_DIR, file), 'utf-8'));
    const res = await handleGeneratePain001(body);

    expect(res.status).toBe(200);
    const xsd = await validateAgainstXsd(res.body, body.version);
    expect(formatXsdErrors(xsd)).toEqual([]);
    const xml = compact(res.body);
    for (const fragment of EXPECTED[file].contains) {
      expect(xml).toContain(compact(fragment));
    }
    for (const fragment of EXPECTED[file].notContains ?? []) {
      expect(xml).not.toContain(compact(fragment));
    }
  });

  it('uc08 – randomMsgId hängt eine 6-stellige Zufallszahl an die MsgId an', async () => {
    const body = JSON.parse(readFileSync(join(EXAMPLES_DIR, 'uc08-eindeutige-msgid.json'), 'utf-8'));
    const res = await handleGeneratePain001(body);
    expect(res.body).toMatch(/<MsgId>MSG-UC08-2026-05-01-\d{6}<\/MsgId>/);
  });
});
