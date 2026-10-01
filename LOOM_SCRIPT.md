# LOOM_SCRIPT.md — MedScanner Labs (~2:45)

> **Setup before recording:** Both servers running. Browser at http://localhost:5173. DevTools closed. Viewport at ~1280px. Tab with the repo open in your editor.

---

## 0:00–0:20 — Intro

*"Hi, I'm [name]. I built MedScanner Labs — a mini lab price-aggregator, similar in concept to Skyscanner but for Indian diagnostic tests. The idea is simple: you search for a test, enter your pincode, and the app tells you which labs near you offer it and what the true final price is — offer price plus home collection fee — sorted from cheapest to most expensive. Let me show you."*

---

## 0:20–1:15 — Live Demo

**Step 1 — Lipid Profile + 110001** *(show the sort order and the package catch)*

*Click the "Lipid Profile – 110001" quick-try chip.*

*"Four results come back, sorted by total final price. Local City Lab is cheapest at ₹450 — no home collection so the price is just the offer price. Apollo is ₹900 — that's ₹800 offer price plus a ₹100 home collection fee. You can see the breakdown line here. Notice 'You save ₹200' is small and secondary — it's not the payable amount, the total final price is always the big number."*

*Scroll down to Lal PathLabs and Tata 1mg.*

*"These two are packages — they contain Lipid Profile inside included_tests, not as their item name. The app caught them because it searches both item_name and the included_tests array. If I only searched item_name I'd silently miss these — that would be a bug."*

**Step 2 — Lipid Profile + 560034** *(show pincode filtering)*

*Click "Lipid Profile – 560034" chip.*

*"Only 2 results now. Local City Lab and Apollo don't service this pincode, so they're filtered out. The pincode filter is a simple string comparison against each provider's available_pincodes list."*

**Step 3 — Empty state**

*Type "zzz" in Test Name, "999999" in Pincode, hit Search.*

*"No results — the empty state appears. The meta field on the API response also tells us whether this test exists in other pincodes, which we surface here if relevant."*

**Step 4 — Mobile** *(resize to ~375px)*

*"On mobile the form stacks vertically, cards adapt, package chips wrap cleanly, no horizontal overflow."*

---

## 1:15–2:20 — Code Walkthrough

*Switch to editor. Show the flow as a trail:*

**Input → API request**
> `frontend/src/api.js` — wraps `fetch`, uses `AbortController`, surfaces API error messages.

**Pincode filter → test/package match**
> `backend/src/searchService.js` — show `normalize()`, `filterByPincode()`, `matchSearch()` (the `included_tests` check), `enrichWithPricing()`, `sortByFinalPrice()` with the tie-breakers.
>
> *"Each function is pure — same input, same output, no side effects. This is what makes the tests easy to write."*

**Final price → sort → API response**
> `backend/src/app.js` — show the `/api/search` handler: validation, calling `searchLabs`, returning 200 for zero results (explain why), the production static-serving block.

**Response → React cards**
> `frontend/src/components/ResultCard.jsx` — show `buildBreakdownLine()`, price block hierarchy.
> `frontend/src/App.jsx` — show the `status` state machine (`idle → loading → results/empty/error`).

**Tests**
> `backend/tests/search.test.js` — `npm test` in terminal. Show 22/22 pass.

---

## 2:20–2:45 — Stack, Deployment, Improvements

*"Why this stack? React + Vite for fast iteration, Express because it's simple and ES-module-native, plain CSS because I don't need a build step to purge Tailwind, and a single JSON file because the assignment calls for mock data."*

*"For deployment, there's a `render.yaml` in the repo. Render runs `npm run install:all && npm run build` then `npm start`. Express serves the built React app from `frontend/dist` in production — one URL, one service, no CORS config needed."*

*"If I were building this for real, the first things I'd add are: synonym expansion in normalisation so 'CBC' matches 'Complete Blood Count', a cache layer so searches read from Redis rather than scanning the JSON on every request, and provider-specific adapters that can pull from real data sources."*

*"Thanks for watching."*

---

> **Note:** LOOM_SCRIPT.md is committed to the repo for reference.
