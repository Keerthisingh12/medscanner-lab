/**
 * ErrorState.jsx
 * Shown when the fetch itself fails (network error, 5xx).
 * For 400 validation errors, the API's message is surfaced instead.
 * "Try again" re-runs the last search.
 */

import { AlertCircle, RefreshCw } from 'lucide-react';

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <p className="error-state__heading">
        <AlertCircle size={16} aria-hidden="true" />
        Something went wrong while comparing prices.
      </p>
      {message && (
        <p className="error-state__message">{message}</p>
      )}
      {onRetry && (
        <button className="retry-btn" onClick={onRetry} type="button">
          <RefreshCw size={13} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
