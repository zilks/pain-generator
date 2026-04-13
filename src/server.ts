// ============================================================
// Express HTTP server – PAIN.001 Generator
// Endpoint: POST /api/generate-pain001
// Swagger UI: GET  /api
// Start: npm start
// ============================================================

import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { handleGeneratePain001 } from './pain001.handler';
import { swaggerSpec } from './swagger';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const API_PREFIX = '/api';
const ROUTE = `${API_PREFIX}/generate-pain001`;

app.use(express.json());

// ── Swagger UI ────────────────────────────────────────────
app.use(API_PREFIX, swaggerUi.serve);
app.get(API_PREFIX, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'PAIN.001 Generator API',
  swaggerOptions: {
    defaultModelsExpandDepth: -1, // Schemas-Sektion standardmässig eingeklappt
  },
}));

// ── PAIN.001 Endpunkt ─────────────────────────────────────
app.post(ROUTE, async (req: Request, res: Response) => {
  console.log(`[REQ] POST ${ROUTE} – ${new Date().toISOString()}`);
  const result = await handleGeneratePain001(req.body);

  res.status(result.status);
  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value);
  }
  res.send(result.body);
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: `Unknown endpoint. Please use POST ${ROUTE}.` });
});

app.listen(PORT, () => {
  console.log(`✅  PAIN.001 server running`);
  console.log(`   POST ${ROUTE}`);
  console.log(`   Swagger UI → http://localhost:${PORT}${API_PREFIX}`);
});
