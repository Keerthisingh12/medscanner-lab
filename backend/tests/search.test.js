/**
 * search.test.js
 * Backend tests using Node's built-in node:test + supertest.
 * Covers all 7 required test cases plus validation edge cases.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import supertest from 'supertest';
import { app, loadData } from '../src/app.js';
import {
  normalize,
  filterByPincode,
  matchSearch,
  enrichWithPricing,
  sortByFinalPrice,
  searchLabs,
} from '../src/searchService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '../data/labs.json');

let request;

before(async () => {
  await loadData();
  request = supertest(app);
});

// ─────────────────────────────────────────────────────────────────
// TC1: Lipid Profile + 110001
// Expected order by total_final_price ASC:
//   Local City Lab  450+0=450
//   Apollo          800+100=900
//   Lal PathLabs    1600+50=1650  (package, via included_tests)
//   Tata 1mg        1999+0=1999   (package, via included_tests)
// ─────────────────────────────────────────────────────────────────
describe('TC1 – Lipid Profile + 110001', () => {
  it('returns 4 results in correct order', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=110001'
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 4);
    assert.equal(res.body.sorted_by, 'total_final_price_asc');

    const names = res.body.results.map((r) => r.provider_name);
    assert.deepEqual(names, [
      'Local City Lab',
      'Apollo Diagnostics',
      'Lal PathLabs',
      'Tata 1mg',
    ]);

    const prices = res.body.results.map((r) => r.total_final_price);
    assert.deepEqual(prices, [450, 900, 1650, 1999]);
  });
});

// ─────────────────────────────────────────────────────────────────
// TC2: Lipid Profile + 560034
// Only Lal PathLabs (1650) and Tata 1mg (1999) service this pincode.
// ─────────────────────────────────────────────────────────────────
describe('TC2 – Lipid Profile + 560034', () => {
  it('returns Lal PathLabs then Tata 1mg', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=560034'
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 2);

    const names = res.body.results.map((r) => r.provider_name);
    assert.deepEqual(names, ['Lal PathLabs', 'Tata 1mg']);
    assert.deepEqual(res.body.results.map((r) => r.total_final_price), [
      1650, 1999,
    ]);
  });

  it('excludes Local City Lab and Apollo (wrong pincode)', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=560034'
    );
    const names = res.body.results.map((r) => r.provider_name);
    assert.ok(!names.includes('Local City Lab'));
    assert.ok(!names.includes('Apollo Diagnostics'));
  });
});

// ─────────────────────────────────────────────────────────────────
// TC3: MRI Brain + 560034 -> Local Scan Centre, 4200
// ─────────────────────────────────────────────────────────────────
describe('TC3 – MRI Brain + 560034', () => {
  it('returns Local Scan Centre with total_final_price 4200', async () => {
    const res = await request.get(
      '/api/search?search_query=MRI%20Brain&pincode=560034'
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.results[0].provider_name, 'Local Scan Centre');
    assert.equal(res.body.results[0].total_final_price, 4200);
  });
});

// ─────────────────────────────────────────────────────────────────
// TC4: Lipid Profile + 999999 -> count 0 (pincode not serviced)
// ─────────────────────────────────────────────────────────────────
describe('TC4 – Lipid Profile + 999999', () => {
  it('returns count 0 with 200 status', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=999999'
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 0);
    assert.deepEqual(res.body.results, []);
  });
});

// ─────────────────────────────────────────────────────────────────
// TC5: Unknown Test + 110001 -> count 0 (no match)
// ─────────────────────────────────────────────────────────────────
describe('TC5 – Unknown Test + 110001', () => {
  it('returns count 0 with 200 status', async () => {
    const res = await request.get(
      '/api/search?search_query=Unknown%20Test&pincode=110001'
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 0);
    assert.deepEqual(res.body.results, []);
  });
});

// ─────────────────────────────────────────────────────────────────
// TC6: Case/format variants all return the same results
// ─────────────────────────────────────────────────────────────────
describe('TC6 – Normalization: case and format variants', () => {
  const variants = [
    'lipid profile',
    'LIPID PROFILE',
    '  Lipid-Profile ',
    'Lipid Profile',
  ];

  for (const q of variants) {
    it(`"${q}" returns the same 4 results as canonical form`, async () => {
      const res = await request.get(
        `/api/search?search_query=${encodeURIComponent(q)}&pincode=110001`
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.count, 4);
      const prices = res.body.results.map((r) => r.total_final_price);
      assert.deepEqual(prices, [450, 900, 1650, 1999]);
    });
  }

  it('normalize() lowercases, trims, collapses hyphens to spaces', () => {
    assert.equal(normalize('  LIPID-profile '), 'lipid profile');
    assert.equal(normalize('MRI--Brain'), 'mri brain');
    assert.equal(normalize('Blood_Sugar'), 'blood sugar');
  });
});

// ─────────────────────────────────────────────────────────────────
// TC7: Packages returned via included_tests
// ids 103 (Lal PathLabs) and 104 (Tata 1mg) must appear for Lipid Profile
// ─────────────────────────────────────────────────────────────────
describe('TC7 – Packages returned via included_tests', () => {
  it('includes Lal PathLabs (package) and Tata 1mg (package) in 110001 results', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=110001'
    );
    const packages = res.body.results.filter((r) => r.item_type === 'package');
    const packageNames = packages.map((r) => r.provider_name).sort();
    assert.deepEqual(packageNames, ['Lal PathLabs', 'Tata 1mg']);
  });

  it('package records carry item_type = "package"', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=110001'
    );
    const lal = res.body.results.find((r) => r.provider_name === 'Lal PathLabs');
    assert.equal(lal.item_type, 'package');
    assert.ok(Array.isArray(lal.included_tests));
    assert.ok(lal.included_tests.includes('Lipid Profile'));
  });
});

// ─────────────────────────────────────────────────────────────────
// Validation: 400 for bad inputs
// ─────────────────────────────────────────────────────────────────
describe('Validation – 400 errors', () => {
  it('missing search_query -> 400', async () => {
    const res = await request.get('/api/search?pincode=110001');
    assert.equal(res.status, 400);
    assert.ok(res.body.error?.code);
  });

  it('whitespace-only search_query -> 400', async () => {
    const res = await request.get(
      '/api/search?search_query=%20%20&pincode=110001'
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'MISSING_SEARCH_QUERY');
  });

  it('missing pincode -> 400', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile'
    );
    assert.equal(res.status, 400);
    assert.ok(res.body.error?.code);
  });

  it('pincode "12" (too short) -> 400', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=12'
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_PINCODE');
  });

  it('pincode "abcdef" (non-numeric) -> 400', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=abcdef'
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_PINCODE');
  });
});

// ─────────────────────────────────────────────────────────────────
// Data integrity: labs.json is never mutated
// ─────────────────────────────────────────────────────────────────
describe('Data integrity', () => {
  it('labs.json has exactly 5 records with ids 101-105', () => {
    const labs = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    assert.equal(labs.length, 5);
    const ids = labs.map((l) => l.id).sort((a, b) => a - b);
    assert.deepEqual(ids, [101, 102, 103, 104, 105]);
  });

  it('source data is not mutated after search (no total_final_price on raw records)', async () => {
    // Run a search (which enriches records in memory)
    await request.get('/api/search?search_query=Lipid%20Profile&pincode=110001');
    // Re-read from disk and confirm no derived fields were written
    const labs = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    for (const lab of labs) {
      assert.equal(lab.total_final_price, undefined);
      assert.equal(lab.savings, undefined);
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// Price derivation
// ─────────────────────────────────────────────────────────────────
describe('Price derivation', () => {
  it('total_final_price = offer_price + home_collection_fee', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=110001'
    );
    const apollo = res.body.results.find(
      (r) => r.provider_name === 'Apollo Diagnostics'
    );
    assert.equal(apollo.total_final_price, 900); // 800 + 100
    assert.equal(apollo.savings, 200); // 1000 - 800
  });

  it('savings = mrp - offer_price (not total_final_price)', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=110001'
    );
    for (const r of res.body.results) {
      const expected = r.pricing.mrp - r.pricing.offer_price;
      assert.equal(r.savings, expected);
    }
  });
});
