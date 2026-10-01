/**
 * Badge.jsx
 * Renders a small labelled chip: item type (test/package), NABL, "Lowest final price".
 */

import { FlaskConical, Package, ShieldCheck, TrendingDown } from 'lucide-react';

export function Badge({ variant, children }) {
  return (
    <span className={`badge badge--${variant}`}>
      {children}
    </span>
  );
}

export function ItemTypeBadge({ itemType }) {
  if (itemType === 'package') {
    return (
      <Badge variant="package">
        <Package size={11} aria-hidden="true" /> PACKAGE
      </Badge>
    );
  }
  return (
    <Badge variant="test">
      <FlaskConical size={11} aria-hidden="true" /> SINGLE TEST
    </Badge>
  );
}

export function NablBadge() {
  return (
    <Badge variant="nabl">
      <ShieldCheck size={11} aria-hidden="true" /> NABL Certified
    </Badge>
  );
}

export function CheapestBadge() {
  return (
    <Badge variant="cheapest">
      <TrendingDown size={11} aria-hidden="true" /> Lowest final price
    </Badge>
  );
}
