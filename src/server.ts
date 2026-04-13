// ============================================================
// Local HTTP server – replacement for Azure Functions Core Tools
// Serves the endpoint at http://localhost:7071/api/generate-pain001
// (same URL as func start → no changes needed in clients)
//
// Start locally: npm run serve
// Deploy to Azure: npm run start  (Azure Functions Core Tools)
// ============================================================

import http from 'http';
import { handleGeneratePain001 } from './pain001.handler';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 7071;
const ROUTE = '/api/generate-pain001';

const server = http.createServer(async (req, res) => {
  // Accept POST requests on the expected route only
  if (req.method !== 'POST' || req.url !== ROUTE) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Unknown endpoint. Please use POST ${ROUTE}.` }));
    return;
  }

  // Read request body
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', async () => {
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request body is not valid JSON.' }));
      return;
    }

    // Invoke core handler (identical to the Azure Function)
    const result = await handleGeneratePain001(body);

    res.writeHead(result.status, result.headers);
    res.end(result.body);
  });
});

server.listen(PORT, () => {
  console.log(`✅  Local PAIN.001 server running at http://localhost:${PORT}${ROUTE}`);
  console.log(`   POST http://localhost:${PORT}${ROUTE}`);
});
