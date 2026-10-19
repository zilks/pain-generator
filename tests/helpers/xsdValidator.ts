// ============================================================
// Test helper – validates generated XML against the SIX XSDs
// in src/schemas using libxml2 (xmllint compiled to WASM).
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { validateXML, XMLValidationResult } from 'xmllint-wasm';
import { Pain001Version } from '../../src/types/pain001.types';

const SCHEMA_FILES: Record<Pain001Version, string> = {
  v2009: join(__dirname, '../../src/schemas/v2009/pain.001.001.03.ch.02.xsd'),
  v2019: join(__dirname, '../../src/schemas/v2019/pain.001.001.09.ch.03.xsd'),
};

const schemaCache: Partial<Record<Pain001Version, string>> = {};

function loadSchema(version: Pain001Version): string {
  return (schemaCache[version] ??= readFileSync(SCHEMA_FILES[version], 'utf-8'));
}

export async function validateAgainstXsd(
  xml: string,
  version: Pain001Version
): Promise<XMLValidationResult> {
  return validateXML({
    xml: { fileName: `pain001_${version}.xml`, contents: xml },
    schema: { fileName: `pain001_${version}.xsd`, contents: loadSchema(version) },
  });
}

/** Formats validation errors as readable lines for assertion messages. */
export function formatXsdErrors(result: XMLValidationResult): string[] {
  return result.errors.map((e) => e.rawMessage.trim());
}
