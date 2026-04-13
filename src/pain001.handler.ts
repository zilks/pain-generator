// ============================================================
// Core handler – framework-agnostic (no Azure imports)
// Used by both the Azure Function and the local Express server.
// ============================================================

import { validatePain001Request } from './validation/pain001.validator';
import { resolveNbOfTxs, resolveCtrlSum } from './utils/calculator';
import { buildV2009 } from './builder/pain001v2009.builder';
// TODO [v2019]: buildV2019 is not production-ready yet – import will be re-enabled once implementation is complete
// import { buildV2019 } from './builder/pain001v2019.builder';
import { Pain001Request, ResolvedPain001Request } from './types/pain001.types';

export interface HandlerRequest {
  body: unknown;
}

export interface HandlerResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export async function handleGeneratePain001(
  body: unknown
): Promise<HandlerResponse> {
  // 1. Validate request
  const validation = validatePain001Request(body);
  if (!validation.valid) {
    return {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Validation error',
        details: validation.errors,
      }),
    };
  }

  const req = body as Pain001Request;

  // 2. Resolve defaults
  const resolved: ResolvedPain001Request = {
    ...req,
    version: req.version ?? 'v2009',
    batchBooking: req.batchBooking ?? true,
    nbOfTxs: resolveNbOfTxs(req.transactions, req.nbOfTxs),
    ctrlSum: resolveCtrlSum(req.transactions, req.ctrlSum),
    creationDateTime:
      req.creationDateTime ?? new Date().toISOString().replace(/\.\d{3}Z$/, ''),
  };

  // 3. Generate XML
  // TODO [v2019]: Implementation incomplete – no validated XSD available yet.
  //               Once the XSD (pain.001.001.09.ch.03.xsd) is available:
  //                 1. Place the XSD file under /schema
  //                 2. Verify pain001v2019.builder.ts against the XSD (see file)
  //                 3. Remove this block and enable v2019
  if (resolved.version === 'v2019') {
    return {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Not implemented',
        details:
          'PAIN.001 v2019 (pain.001.001.09.ch.03) generation is not yet complete. ' +
          'The XSD required for validation is missing. Please use version "v2009".',
      }),
    };
  }

  let xml: string;
  try {
    xml = buildV2009(resolved);
  } catch (err) {
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'XML generation failed.' }),
    };
  }

  // 4. Return response
  const filename = `pain001_${resolved.testRunId}_${resolved.executionDate}_${resolved.version}.xml`;
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
    body: xml,
  };
}
