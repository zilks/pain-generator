// ============================================================
// Core handler – framework-agnostic
// Used by the Express server (src/server.ts).
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
    console.warn('[422] Validation failed:', validation.errors);
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
  if (resolved.version === 'v2019') {
    console.warn(`[501] v2019 not implemented – testRunId=${resolved.testRunId}`);
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
    console.error(`[500] XML generation failed – testRunId=${resolved.testRunId}:`, err);
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'XML generation failed.' }),
    };
  }

  // 4. Return response
  const filename = `pain001_${resolved.testRunId}_${resolved.executionDate}_${resolved.version}.xml`;
  console.log(`[200] Generated ${filename} – txs=${resolved.nbOfTxs}, ctrlSum=${resolved.ctrlSum}`);
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
    body: xml,
  };
}
