import { describe, it, expect, afterEach } from '@jest/globals';
import express from 'express';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { AddressInfo } from 'net';
import { registerFrontend } from '../../src/frontend';

function get(server: http.Server, urlPath: string): Promise<{ status: number; body: string }> {
  const { port } = server.address() as AddressInfo;
  return new Promise((resolve, reject) => {
    http.get({ port, path: urlPath }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    }).on('error', reject);
  });
}

describe('registerFrontend', () => {
  let server: http.Server | undefined;
  let dir: string | undefined;

  afterEach(() => {
    server?.close();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    server = undefined;
    dir = undefined;
  });

  it('returns false and registers nothing if there is no build', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fe-'));
    expect(registerFrontend(express(), dir)).toBe(false);
  });

  it('serves index.html at "/" and assets if a build exists', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fe-'));
    fs.writeFileSync(path.join(dir, 'index.html'), '<title>PAIN Generator</title>');
    fs.writeFileSync(path.join(dir, 'app.js'), 'console.log(1)');
    const app = express();
    expect(registerFrontend(app, dir)).toBe(true);
    server = app.listen(0);

    const index = await get(server, '/');
    expect(index.status).toBe(200);
    expect(index.body).toContain('PAIN Generator');
    expect((await get(server, '/app.js')).status).toBe(200);
    expect((await get(server, '/missing.js')).status).toBe(404);
  });
});
