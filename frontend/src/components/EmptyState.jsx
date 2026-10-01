/**
 * EmptyState.jsx
 * Shown when the API returns count 0.
 * If meta.test_available_in_other_pincodes is true, adds a contextual hint.
 */

import { SearchX } from 'lucide-react';

export function EmptyState({ pincode, testAvailableElsewhere }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state__icon" aria-hidden="true">
        <SearchX size={28} />
      </div>
      <h2 className="empty-state__heading">No matching labs found</h2>
      <p className="empty-state__body">
        Try another test name or pincode.
        {testAvailableElsewhere && pincode && (
          <>
            {' '}
            <br />
            <em>
              This test is available in other pincodes, but not in {pincode}.
            </em>
          </>
        )}
      </p>
    </div>
  );
}
