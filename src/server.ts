// ============================================================
// Express HTTP server – PAIN.001 Generator
// Endpoint: POST /api/generate-pain001
// Start: npm start
// ============================================================

import express, { Request, Response } from 'express';
import { handleGeneratePain001 } from './pain001.handler';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 7071;
const ROUTE = '/api/generate-pain001';

app.use(express.json());

app.post(ROUTE, async (req: Request, res: Response) => {
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
  console.log(`✅  PAIN.001 server running at http://localhost:${PORT}${ROUTE}`);
  console.log(`   POST http://localhost:${PORT}${ROUTE}`);
});
