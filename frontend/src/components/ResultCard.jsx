/**
 * ResultCard.jsx
 * Renders a single lab result card.
 * Price block hierarchy (important for clarity):
 *   MRP (strikethrough, muted)
 *   Offer price (normal weight)
 *   You save (small, secondary green – NOT the payable amount)
 *   Breakdown line (e.g. ₹800 + ₹100 Home Collection)
 *   TOTAL FINAL PRICE (large, bold, most prominent)
 *
 * "You save" is deliberately styled as secondary to avoid confusion with the
 * payable amount. Per the assignment: "savings are never confused with the payable amount."
 */

import { Clock } from 'lucide-react';
import { ItemTypeBadge, NablBadge, CheapestBadge } from './Badge.jsx';
import { PackageTests } from './PackageTests.jsx';

// Indian Rupee formatter with grouping (e.g. ₹1,999)
const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatINR(amount) {
  return INR.format(amount);
}

/**
 * Build the breakdown line mirroring the PDF wording:
 * - home_collection true  + fee > 0  → "₹800 + ₹100 Home Collection"
 * - home_collection true  + fee = 0  → "₹1,999 + Free Home Collection"
 * - home_collection false            → "₹450 (no home collection)"
 */
function buildBreakdownLine(lab) {
  const offerStr = formatINR(lab.pricing.offer_price);
  if (lab.logistics.home_collection) {
    if (lab.logistics.home_collection_fee > 0) {
      return `${offerStr} + ${formatINR(lab.logistics.home_collection_fee)} Home Collection`;
    }
    return `${offerStr} + Free Home Collection`;
  }
  return `${offerStr} (no home collection)`;
}

/**
 * Home collection line for the card footer:
 * - true  + fee > 0 → "+ ₹{fee} home collection"
 * - true  + fee = 0 → "Free home collection"
 * - false            → "Lab visit only (no home collection)"
 */
function homeCollectionText(lab) {
  if (lab.logistics.home_collection) {
    if (lab.logistics.home_collection_fee > 0) {
      return `+ ${formatINR(lab.logistics.home_collection_fee)} home collection`;
    }
    return 'Free home collection';
  }
  return 'Lab visit only (no home collection)';
}

export function ResultCard({ lab, isCheapest }) {
  return (
    <li className={`result-card${isCheapest ? ' result-card--cheapest' : ''}`}>
      <div className="result-card__layout">
        {/* ── Left: provider info ── */}
        <div className="result-card__info">
          <div className="result-card__header">
            <span className="result-card__provider">{lab.provider_name}</span>
            <ItemTypeBadge itemType={lab.item_type} />
            {isCheapest && <CheapestBadge />}
          </div>

          <p className="result-card__item-name">{lab.item_name}</p>

          {/* Package included tests chips */}
          {lab.item_type === 'package' && (
            <PackageTests tests={lab.included_tests} />
          )}

          <div className="result-card__meta">
            <span className="result-card__tat">
              <Clock size={12} aria-hidden="true" />
              Report in {lab.logistics.report_tat_hours} hours
            </span>
            {lab.nabl_accredited && <NablBadge />}
          </div>
        </div>

        {/* ── Right: pricing ── */}
        <div className="result-card__pricing">
          {/* MRP – strikethrough, visually muted */}
          <p className="price-mrp" aria-label={`MRP ${formatINR(lab.pricing.mrp)}`}>
            MRP {formatINR(lab.pricing.mrp)}
          </p>

          {/* Offer price */}
          <p className="price-offer">
            Offer price {formatINR(lab.pricing.offer_price)}
          </p>

          {/* Savings – small, secondary, green. Clearly NOT the payable amount. */}
          <p className="price-savings" aria-label={`You save ${formatINR(lab.savings)}`}>
            You save {formatINR(lab.savings)}
          </p>

          {/* Breakdown (how the total is composed) */}
          <p className="price-breakdown" title={buildBreakdownLine(lab)}>
            {buildBreakdownLine(lab)}
          </p>

          {/* Total final price – largest, most prominent */}
          <p className="price-total">
            <span className="price-total__label">Total final price</span>
            {formatINR(lab.total_final_price)}
          </p>
        </div>
      </div>
    </li>
  );
}
