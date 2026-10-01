# MedScanner Labs — Mini Lab Aggregator

A price-comparison tool for Indian diagnostic lab tests. Search by test name and pincode to see which providers are available near you, and compare their true final prices (offer price + home collection fee).

---

## Features

- **Pincode-based availability filtering** — only shows labs that service your area
- **Package detection** — packages containing the searched test are returned alongside standalone tests
- **True final price** — offer price + home collection fee, sorted ascending
- **Case- and format-insensitive search** — `LIPID-profile`, `lipid profile`, `Lipid Profile` all work
- **"You save"** displayed as a secondary indicator, never mistaken for the payable amount
- **NABL Certified badge** shown only when the data confirms accreditation
- Shareable URLs, AbortController, loading/empty/error states
- Responsive at 375 px, 768 px, 1280 px

---

## Tech Stack

| Layer    | Choice           | Why                                                       |
|----------|------------------|-----------------------------------------------------------|
| Frontend | React 18 + Vite  | Fast HMR, small bundle, no framework overhead             |
| Styling  | Plain CSS (vars) | Full control, no build-time Tailwind purge complexity     |
| Icons    | lucide-react     | Lightweight, tree-shakeable                               |
| Backend  | Node 18 + Express| Simple, ES-module-native, well-understood                 |
| Data     | Local JSON       | Assignment requirement; no DB needed for this scope       |
| Deploy   | Render (1 service)| Single URL hosts API + built frontend; free tier           |

---

## Architecture

```
React (Vite dev) → /api/* proxy → Express REST API
                                      ↓
                               local labs.json
                                      ↓
                           normalize query & data
                                      ↓
                           filter by pincode (string match)
                                      ↓
                      match item_name OR included_tests (substring)
                                      ↓
                      compute total_final_price & savings
                                      ↓
                         sort by total_final_price ASC
                                      ↓
                              JSON response → React cards
```

In production, Express serves the built React app and handles all routes from a single Render web service.

---

## Search Logic

1. **Normalize** query and field values (lowercase, trim, hyphens→spaces, collapse whitespace)
2. **Filter** by pincode — string comparison against `available_pincodes`
3. **Match** — normalized query is a substring of normalized `item_name` OR any entry in `included_tests`

---

## Package Matching

A lab package is returned when the searched test name appears in its `included_tests` array. For example, searching "Lipid Profile" returns the *Wellness Basic Package* (Lal PathLabs) and *Comprehensive Health Checkup* (Tata 1mg) because both include Lipid Profile in their test list. Matching only `item_name` would silently exclude these packages — that is treated as a bug in the search logic.

---

## Price Calculation

```
Total Final Price = offer_price + home_collection_fee
```

**Example — Apollo Diagnostics:** ₹800 (offer) + ₹100 (home collection) = **₹900 total**

"You save" is a secondary display metric derived from `mrp - offer_price`. It is styled smaller and in a different colour precisely to avoid confusion with the payable amount. The payable amount is always the **Total Final Price**.

---

## Search Normalization

**What is normalized:** `item_name`, each entry in `included_tests`, and the user's query are all passed through the same function: lowercase → trim → replace hyphens/underscores/punctuation with spaces → collapse repeated whitespace.

**Why:** Lab data from real sources arrives inconsistently formatted — `"Lipid-Profile"`, `"LIPID PROFILE"`, `"lipid profile"` are all the same test. Lightweight normalization handles the common cases without adding a fuzzy-matching library.

**Stated limitation:** This is exact substring match after normalization. It does **not** handle spelling variants or synonyms — `"haemogram"` will not match `"hemogram"`, and `"CBC"` will not match `"Complete Blood Count"`. A production system would add synonym expansion or a trigram/full-text index.

---

## API

### `GET /api/health`
Returns `{ "status": "ok" }`. Used as a health check by Render.

### `GET /api/search`

| Parameter      | Type   | Required | Description                    |
|----------------|--------|----------|--------------------------------|
| `search_query` | string | Yes      | Test name (e.g. `Lipid Profile`) |
| `pincode`      | string | Yes      | Exactly 6 digits (e.g. `110001`) |

**Example request:**
```
GET /api/search?search_query=Lipid%20Profile&pincode=110001
```

**Example response (200):**
```json
{
  "query": { "search_query": "Lipid Profile", "pincode": "110001" },
  "count": 4,
  "sorted_by": "total_final_price_asc",
  "meta": { "test_available_in_other_pincodes": false },
  "results": [
    {
      "id": 101,
      "provider_name": "Local City Lab",
      "item_name": "Lipid Profile",
      "item_type": "test",
      "included_tests": [],
      "pricing": { "mrp": 600, "offer_price": 450 },
      "logistics": { "home_collection": false, "home_collection_fee": 0 },
      "report_tat_hours": 24,
      "nabl_accredited": false,
      "available_pincodes": ["110001", "110002"],
      "total_final_price": 450,
      "savings": 150
    }
    ...
  ]
}
```

**Error responses:**

| Code | Scenario                              |
|------|---------------------------------------|
| 400  | Missing or blank `search_query`       |
| 400  | Missing `pincode`                     |
| 400  | `pincode` not exactly 6 digits        |
| 200  | No matching results (count 0, results []) |
| 404  | Unknown API route                     |
| 500  | Unexpected server error (no stack trace exposed) |

Zero results returns 200 (not 404) because the search endpoint itself was found — it just returned an empty set. 404 would misrepresent the situation.

---

## Setup

### Prerequisites
- Node.js 18+

### Local development (two commands in two terminals)

```bash
# Clone and install
git clone <your-repo-url>
cd medscanner-mini-lab-aggregator
npm run install:all

# Terminal 1 — backend (port 5001)
npm run dev --prefix backend

# Terminal 2 — frontend (port 5173, proxies /api to 5001)
npm run dev --prefix frontend
```

Or from the root with concurrently:
```bash
npm run dev
```

Then open http://localhost:5173

> **Note on port:** macOS 12+ reserves port 5000 for ControlCenter AirPlay. The backend defaults to **5001**.

### Production build (single server)

```bash
npm run build     # builds frontend/dist
npm start         # serves API + static frontend from port 5001
# Open http://localhost:5001
```

---

## Tests

```bash
npm test          # from root, or: npm test --prefix backend
```

### Test cases

| # | Scenario | Expected |
|---|----------|----------|
| TC1 | Lipid Profile + 110001 | 4 results: Local City Lab 450, Apollo 900, Lal PathLabs 1650, Tata 1mg 1999 |
| TC2 | Lipid Profile + 560034 | 2 results: Lal PathLabs 1650, Tata 1mg 1999 |
| TC3 | MRI Brain + 560034 | 1 result: Local Scan Centre 4200 |
| TC4 | Lipid Profile + 999999 | 0 results (pincode not serviced) |
| TC5 | Unknown Test + 110001 | 0 results (no match) |
| TC6 | lipid profile / LIPID PROFILE / Lipid-Profile | Same 4 results as TC1 |
| TC7 | Packages returned via included_tests | Lal PathLabs and Tata 1mg show item_type=package |
| V1  | Missing search_query | 400 |
| V2  | Whitespace-only query | 400 |
| V3  | Missing pincode | 400 |
| V4  | Pincode "12" | 400 INVALID_PINCODE |
| V5  | Pincode "abcdef" | 400 INVALID_PINCODE |
| DI1 | labs.json integrity | Exactly 5 records, ids 101–105 |
| DI2 | No source mutation | No total_final_price/savings on raw records after search |
| P1  | Price derivation | Apollo: 800+100=900; savings=200 |

**Actual test run result:** 22/22 tests pass.

---

## Deployment

### Render (recommended — one service, one URL)

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render will detect `render.yaml` automatically, or set manually:
   - **Build Command:** `npm run install:all && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** `NODE_ENV=production`
   - **Health Check Path:** `/api/health`
5. Click Deploy. After ~2 minutes, your app is live at `https://<your-app>.onrender.com`

> Free tier has ~30s cold starts on first request. A "Waking up the server…" notice appears in the UI after 3 seconds.

### Alternative: Vercel (frontend) + Render (backend)

1. Deploy backend to Render (API only)
2. Add `VITE_API_BASE_URL=https://<your-render-backend>.onrender.com` to Vercel env vars
3. Add `CORS_ORIGIN=https://<your-vercel-app>.vercel.app` to Render env vars
4. Deploy frontend to Vercel

---

## Design Decisions

- **React + Vite:** Fast dev experience, small production bundle, no SSR needed for this use case.
- **Plain CSS with variables:** Zero runtime overhead, full control over every pixel, no purge-step to debug. Design system lives in `styles.css` tokens.
- **Express with ES modules:** Clean import/export throughout; no CommonJS bridging.
- **Local JSON, no DB:** The assignment specifies mock data. A real product would swap `loadData()` for a DB client — nothing else changes.
- **Single Render service:** One URL for both API and frontend simplifies CORS, deployment, and the reviewer experience.

---

## Thinking Question: Scraping Architecture

For a production healthcare price-comparison service, the first priority would be establishing official data feeds, APIs, or commercial agreements with providers — scraping is a fallback when no structured source exists, and must always respect `robots.txt` and each site's terms of service. If scraping is unavoidable, a scheduled background fetcher (not triggered per user search) would run on a per-domain basis with strict rate limits, randomised jitter between requests, and exponential backoff on failures, so as not to place meaningful load on provider infrastructure. Results would be stored in a cache with TTL-based freshness, so user searches read from cache instantly and always see a "last updated" timestamp — if a source goes down, stale data is shown rather than an error. Each provider would have its own adapter that transforms raw HTML or JSON into a validated normalised schema (name, strength, pack size, price, availability) with anomaly detection to flag suspiciously large price swings before they reach users. The system would be monitored with alerts for parse-failure rates, HTTP block rates, and price anomalies, so a site layout change is caught within hours rather than days. This assignment uses the provided mock JSON dataset and performs no real scraping.

---

## Future Improvements (not implemented)

- **Real provider adapters:** Per-source scrapers or API integrations behind a common adapter interface
- **Caching layer:** Redis or in-process TTL cache for search results
- **Scheduled price refresh:** Cron job to re-fetch and re-normalise data without blocking user searches
- **Stronger normalisation:** Synonym expansion (`CBC` ↔ `Complete Blood Count`), trigram matching, or a lightweight search index
- **Production database:** PostgreSQL/MongoDB for querying, indexing, and price history
- **Monitoring:** Datadog / Sentry for parse failures, latency, and price anomalies
