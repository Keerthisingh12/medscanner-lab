/**
 * search.test.js
 * Backend tests using Node's built-in node:test + supertest.
 * All expected values derived from the official assignment PDF data (ids "101"–"105").
 *
 * Key derived values (total_final_price = offer_price + home_collection_fee):
 *   Apollo (101):     800 + 100 = 900     pincode: 110001, 110002, 110011
 *   Local City Lab (102): 450 + 0  = 450  pincode: 110001 only
 *   Tata 1mg (103):   1999 + 0  = 1999    pincode: 110001, 110002, 560034, 560035
 *   Lal PathLabs (104): 1500 + 150 = 1650 pincode: 110001, 560034
 *   Local Scan Centre (105): 4200 + 0 = 4200  pincode: 560034 only
 *
 * TC1 Lipid Profile + 110001: 102(450), 101(900), 104(1650), 103(1999)
 * TC2 Lipid Profile + 560034: 104(1650), 103(1999)  — 101 and 102 excluded
 * TC3 MRI Brain + 560034:     105(4200)
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import supertest from 'supertest';
import { app, loadData } from '../src/app.js';
import { normalize } from '../src/searchService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '../data/labs.json');

let request;

before(async () => {
  await loadData();
  request = supertest(app);
});

// ─────────────────────────────────────────────────────────────────
// TC1: Lipid Profile + 110001
// All 4 providers service this pincode and contain "Lipid Profile".
// Expected order by total_final_price ASC:
//   Local City Lab  (102): 450+0   = 450
//   Apollo          (101): 800+100 = 900
//   Lal PathLabs    (104): 1500+150= 1650  (package, via included_tests)
//   Tata 1mg        (103): 1999+0  = 1999  (package, via included_tests)
// ─────────────────────────────────────────────────────────────────
describe('TC1 – Lipid Profile + 110001', () => {
  it('returns 4 results in correct price order', async () => {
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
// Only Lal PathLabs (104) and Tata 1mg (103) service pincode 560034.
// Local City Lab (102) pincode = ["110001"] only → excluded.
// Apollo (101) pincode = ["110001","110002","110011"] → excluded.
// ─────────────────────────────────────────────────────────────────
describe('TC2 – Lipid Profile + 560034', () => {
  it('returns Lal PathLabs (1650) then Tata 1mg (1999)', async () => {
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

  it('excludes Local City Lab and Apollo Diagnostics (wrong pincode)', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=560034'
    );
    const names = res.body.results.map((r) => r.provider_name);
    assert.ok(!names.includes('Local City Lab'));
    assert.ok(!names.includes('Apollo Diagnostics'));
  });
});

// ─────────────────────────────────────────────────────────────────
// TC3: MRI Brain + 560034 → Local Scan Centre (105), total 4200
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
// TC4: Lipid Profile + 999999 → no provider services this pincode
// ─────────────────────────────────────────────────────────────────
describe('TC4 – Lipid Profile + 999999', () => {
  it('returns 200 with count 0 and empty results', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=999999'
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 0);
    assert.deepEqual(res.body.results, []);
  });
});

// ─────────────────────────────────────────────────────────────────
// TC5: Unknown Test + 110001 → no match in any item_name or included_tests
// ─────────────────────────────────────────────────────────────────
describe('TC5 – Unknown Test + 110001', () => {
  it('returns 200 with count 0', async () => {
    const res = await request.get(
      '/api/search?search_query=Unknown%20Test&pincode=110001'
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 0);
    assert.deepEqual(res.body.results, []);
  });
});

// ─────────────────────────────────────────────────────────────────
// TC6: Normalization – all variants give identical results to "Lipid Profile"
// ─────────────────────────────────────────────────────────────────
describe('TC6 – Normalization: case and format variants', () => {
  const variants = [
    'lipid profile',
    'LIPID PROFILE',
    '  Lipid-Profile ',
    'Lipid Profile',
  ];

  for (const q of variants) {
    it(`"${q}" → same 4 results as canonical form (110001)`, async () => {
      const res = await request.get(
        `/api/search?search_query=${encodeURIComponent(q)}&pincode=110001`
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.count, 4);
      assert.deepEqual(
        res.body.results.map((r) => r.total_final_price),
        [450, 900, 1650, 1999]
      );
    });
  }

  it('normalize() lowercases, trims, collapses hyphens/underscores to spaces', () => {
    assert.equal(normalize('  LIPID-profile '), 'lipid profile');
    assert.equal(normalize('MRI--Brain'), 'mri brain');
    assert.equal(normalize('Blood_Sugar'), 'blood sugar');
  });
});

// ─────────────────────────────────────────────────────────────────
// TC7: Packages returned via included_tests
// Tata 1mg (103) and Lal PathLabs (104) contain "Lipid Profile"
// in their included_tests; both must appear in Lipid Profile results.
// ─────────────────────────────────────────────────────────────────
describe('TC7 – Packages returned via included_tests', () => {
  it('Tata 1mg and Lal PathLabs (packages) appear in 110001 results', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=110001'
    );
    const packages = res.body.results.filter((r) => r.item_type === 'package');
    const packageNames = packages.map((r) => r.provider_name).sort();
    assert.deepEqual(packageNames, ['Lal PathLabs', 'Tata 1mg']);
  });

  it('package records carry item_type="package" and a non-empty included_tests', async () => {
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
// Validation – 400 errors for bad inputs
// ─────────────────────────────────────────────────────────────────
describe('Validation – 400 errors', () => {
  it('missing search_query → 400', async () => {
    const res = await request.get('/api/search?pincode=110001');
    assert.equal(res.status, 400);
    assert.ok(res.body.error?.code);
  });

  it('whitespace-only search_query → 400', async () => {
    const res = await request.get(
      '/api/search?search_query=%20%20&pincode=110001'
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'MISSING_SEARCH_QUERY');
  });

  it('missing pincode → 400', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile'
    );
    assert.equal(res.status, 400);
    assert.ok(res.body.error?.code);
  });

  it('pincode "12" (too short) → 400 INVALID_PINCODE', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=12'
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_PINCODE');
  });

  it('pincode "abcdef" (non-numeric) → 400 INVALID_PINCODE', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=abcdef'
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_PINCODE');
  });
});

// ─────────────────────────────────────────────────────────────────
// Data integrity – labs.json must not be mutated by searches
// ─────────────────────────────────────────────────────────────────
describe('Data integrity', () => {
  it('labs.json has exactly 5 records with string ids "101"–"105"', () => {
    const labs = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    assert.equal(labs.length, 5);
    const ids = labs.map((l) => l.id).sort();
    assert.deepEqual(ids, ['101', '102', '103', '104', '105']);
  });

  it('source records are not mutated after a search (no derived fields on disk)', async () => {
    await request.get('/api/search?search_query=Lipid%20Profile&pincode=110001');
    const labs = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    for (const lab of labs) {
      assert.equal(lab.total_final_price, undefined);
      assert.equal(lab.savings, undefined);
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// Price derivation correctness
// ─────────────────────────────────────────────────────────────────
describe('Price derivation', () => {
  it('total_final_price = offer_price + home_collection_fee (Apollo: 800+100=900)', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=110001'
    );
    const apollo = res.body.results.find(
      (r) => r.provider_name === 'Apollo Diagnostics'
    );
    assert.equal(apollo.total_final_price, 900);  // 800 + 100
    assert.equal(apollo.savings, 200);             // 1000 - 800
  });

  it('Lal PathLabs fee 150 → total 1650 (1500+150)', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=110001'
    );
    const lal = res.body.results.find((r) => r.provider_name === 'Lal PathLabs');
    assert.equal(lal.total_final_price, 1650);
    assert.equal(lal.savings, 700); // 2200 - 1500
  });

  it('savings = mrp - offer_price for all results (never total_final_price)', async () => {
    const res = await request.get(
      '/api/search?search_query=Lipid%20Profile&pincode=110001'
    );
    for (const r of res.body.results) {
      const expected = r.pricing.mrp - r.pricing.offer_price;
      assert.equal(r.savings, expected);
    }
  });
});
