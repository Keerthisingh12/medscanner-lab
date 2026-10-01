/**
 * searchService.js
 * Pure functions for the search pipeline:
 * normalize -> pincode filter -> search match -> price -> sort
 *
 * All functions are side-effect-free and never mutate the source data.
 */

// ─── A. Normalization ──────────────────────────────────────────────────────────
// Applied to both the user query AND item_name / included_tests before comparison.
// Limitation: this handles common formatting noise (case, hyphens, extra spaces)
// but it is NOT fuzzy – "haemogram" will not match "hemogram".

export function normalize(str) {
  return String(str)
    .toLowerCase()
    .trim()
    // Replace hyphens, underscores, and common punctuation with spaces
    .replace(/[-_/.,;:()]+/g, ' ')
    // Collapse repeated whitespace into a single space
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── B. Pincode filter ─────────────────────────────────────────────────────────
// Keep only records where available_pincodes contains the requested pincode.
// String compare after trim – no numeric coercion.

export function filterByPincode(labs, pincode) {
  const target = String(pincode).trim();
  return labs.filter((lab) =>
    lab.available_pincodes.some((p) => String(p).trim() === target)
  );
}

// ─── C. Search match ───────────────────────────────────────────────────────────
// Substring match (intentional): searching "lipid" matches "Lipid Profile".
// A record matches if the normalized query appears in item_name OR in any
// entry of included_tests – so packages that contain the test are returned too.
// Matching only item_name is a bug: packages would be silently excluded.

export function matchSearch(labs, normalizedQuery) {
  return labs.filter((lab) => {
    const nameMatch = normalize(lab.item_name).includes(normalizedQuery);
    const testMatch =
      Array.isArray(lab.included_tests) &&
      lab.included_tests.some((t) => normalize(t).includes(normalizedQuery));
    return nameMatch || testMatch;
  });
}

// ─── D. Price derivation ───────────────────────────────────────────────────────
// total_final_price = offer_price + home_collection_fee
// savings = mrp - offer_price  (secondary info; NOT the payable amount)
// New objects are returned; source data is never mutated.

export function enrichWithPricing(labs) {
  return labs.map((lab) => ({
    ...lab,
    total_final_price:
      lab.pricing.offer_price + lab.logistics.home_collection_fee,
    savings: lab.pricing.mrp - lab.pricing.offer_price,
  }));
}

// ─── E. Sort ──────────────────────────────────────────────────────────────────
// Primary: total_final_price ASC
// Tie-breaker 1: offer_price ASC
// Tie-breaker 2: provider_name A-Z (deterministic for identical prices)
// Never sort by MRP alone or name first.

export function sortByFinalPrice(labs) {
  return [...labs].sort((a, b) => {
    if (a.total_final_price !== b.total_final_price)
      return a.total_final_price - b.total_final_price;
    if (a.pricing.offer_price !== b.pricing.offer_price)
      return a.pricing.offer_price - b.pricing.offer_price;
    return a.provider_name.localeCompare(b.provider_name);
  });
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────
// Runs all steps in order given the full labs array, a raw query, and a pincode.
// Returns { results, testAvailableElsewhere }.

export function searchLabs(labs, rawQuery, pincode) {
  const normalizedQuery = normalize(rawQuery);

  const byPincode = filterByPincode(labs, pincode);
  const matched = matchSearch(byPincode, normalizedQuery);
  const priced = enrichWithPricing(matched);
  const sorted = sortByFinalPrice(priced);

  // Optional: detect if the test exists in other pincodes (for empty-state hint)
  const testAvailableElsewhere =
    sorted.length === 0 &&
    matchSearch(labs, normalizedQuery).length > 0;

  return { results: sorted, testAvailableElsewhere };
}
