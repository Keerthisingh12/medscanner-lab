/**
 * server.js
 * Imports the app, loads data, then binds the HTTP server.
 * Kept separate from app.js so tests can use the app without starting a server.
 */

import { app, loadData } from './app.js';

const PORT = process.env.PORT || 5001;

await loadData();

app.listen(PORT, () => {
  console.log(`[MedScanner] Backend running on http://localhost:${PORT}`);
});
