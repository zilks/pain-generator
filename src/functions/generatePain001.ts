// ============================================================
// Azure Function v4 – HTTP Trigger: POST /api/generate-pain001
// Thin Azure wrapper – core logic lives in pain001.handler.ts
// ============================================================

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { handleGeneratePain001 } from '../pain001.handler';

// ── Azure wrapper ─────────────────────────────────────────────

async function generatePain001Handler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('generatePain001 triggered');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Request body is not valid JSON.' }),
    };
  }

  return handleGeneratePain001(body);
}

// ── Registration ─────────────────────────────────────────────

app.http('generatePain001', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'generate-pain001',
  handler: generatePain001Handler,
});
