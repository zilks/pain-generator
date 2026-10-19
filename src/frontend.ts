// ============================================================
// Static frontend – serves the built Svelte app (frontend/dist)
// ============================================================

import express, { Express } from 'express';
import fs from 'fs';
import path from 'path';

/** Default location of the frontend build, relative to dist/src (compiled) and src (ts-node). */
export const DEFAULT_FRONTEND_DIR = process.env.FRONTEND_DIR ?? path.resolve(__dirname, '..', '..', 'frontend', 'dist');

/**
 * Serves the frontend at "/" if a build exists in `dir`.
 * @returns true if the frontend was registered
 */
export function registerFrontend(app: Express, dir: string = DEFAULT_FRONTEND_DIR): boolean {
  if (!fs.existsSync(path.join(dir, 'index.html'))) {
    return false;
  }
  app.use(express.static(dir));
  return true;
}
