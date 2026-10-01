/**
 * app.js
 * Creates and exports the Express app.
 * Kept separate from server.js so tests can import the app without binding a port.
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { searchLabs } from './searchService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────────
// CORS_ORIGIN is configurable via env so production can lock it down if needed.
// Default '*' is intentionally permissive for this demo / local development.
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));

app.use(express.json());

// ─── Load data once at startup ─────────────────────────────────────────────────
const dataPath = resolve(__dirname, '../data/labs.json');
let LABS = [];

export async function loadData() {
  const raw = await readFile(dataPath, 'utf8');
  LABS = JSON.parse(raw);
}

// ─── /api/health ───────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─── /api/search ───────────────────────────────────────────────────────────────
app.get('/api/search', (req, res) => {
  const { search_query, pincode } = req.query;

  // Validation: 400 for bad inputs
  if (!search_query || !String(search_query).trim()) {
    return res.status(400).json({
      error: {
        code: 'MISSING_SEARCH_QUERY',
        message: 'search_query is required and must not be blank.',
      },
    });
  }

  if (pincode === undefined || pincode === null) {
    return res.status(400).json({
      error: {
        code: 'MISSING_PINCODE',
        message: 'pincode is required.',
      },
    });
  }

  const pincodeStr = String(pincode).trim();
  if (!/^\d{6}$/.test(pincodeStr)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_PINCODE',
        message:
          'pincode must be exactly 6 digits (e.g. 110001). Received: ' +
          pincodeStr,
      },
    });
  }

  const { results, testAvailableElsewhere } = searchLabs(
    LABS,
    search_query,
    pincodeStr
  );

  // 200 for zero results is intentional: no matches is a valid, expected outcome,
  // not an application error. Returning 404 would be semantically wrong here –
  // the /api/search resource itself was found; it just returned an empty set.
  return res.json({
    query: { search_query: String(search_query).trim(), pincode: pincodeStr },
    count: results.length,
    sorted_by: 'total_final_price_asc',
    meta: {
      test_available_in_other_pincodes: testAvailableElsewhere,
    },
    results,
  });
});

// ─── Production static serving ─────────────────────────────────────────────────
// When NODE_ENV=production or frontend/dist exists, Express serves the built
// React app and falls back to index.html for client-side routes. This lets ONE
// Render web service host the entire app at a single URL without a separate CDN.
const distPath = resolve(__dirname, '../../frontend/dist');
if (process.env.NODE_ENV === 'production' || existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback: non-/api routes serve index.html
  app.get(/^(?!\/api).*/, (_req, res) => {
    const indexPath = join(distPath, 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend build not found.');
    }
  });
}

// ─── 404 for unknown /api routes ───────────────────────────────────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'API route not found.' },
  });
});

// ─── Global error handler ──────────────────────────────────────────────────────
// No stack trace in response – never leak internals to clients.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  });
});

export { app };
