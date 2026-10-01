/**
 * ResultsList.jsx
 * Renders the full result set with a header showing count and sort order.
 */

import { ArrowUpDown } from 'lucide-react';
import { ResultCard } from './ResultCard.jsx';

export function ResultsList({ data }) {
  const { results, query, count } = data;

  const countLabel =
    count === 1 ? '1 option found' : `${count} options found`;

  return (
    <section aria-label="Search results">
      {/* Results header */}
      <div className="results-header">
        <p className="results-header__count">{countLabel}</p>
        <p className="results-header__meta">
          for <strong>{query.search_query}</strong> near pincode{' '}
          <strong>{query.pincode}</strong>
        </p>
        <p className="results-header__sort">
          <ArrowUpDown size={13} aria-hidden="true" />
          Sorted by lowest final price
        </p>
      </div>

      {/* Cards */}
      <ul className="results-list" aria-label="Lab results">
        {results.map((lab, index) => (
          <ResultCard
            key={lab.id}
            lab={lab}
            isCheapest={index === 0}
          />
        ))}
      </ul>
    </section>
  );
}
