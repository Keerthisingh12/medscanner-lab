/**
 * LoadingState.jsx
 * Skeleton cards while search is in-flight. Shows a delayed notice
 * after 3 seconds (for Render free-tier cold starts).
 */

import { useState, useEffect } from 'react';

function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card__row">
        <div className="skeleton-card__left">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--text" />
          <div className="skeleton skeleton--text-sm" />
        </div>
        <div className="skeleton-card__right">
          <div className="skeleton skeleton--price" />
        </div>
      </div>
    </div>
  );
}

export function LoadingState() {
  const [showDelayedNotice, setShowDelayedNotice] = useState(false);

  // After 3s, hint about cold-start latency (Render free tier).
  useEffect(() => {
    const timer = setTimeout(() => setShowDelayedNotice(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="loading-state" role="status" aria-label="Comparing prices, please wait">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      {showDelayedNotice && (
        <p className="loading-notice">
          <span>⏱</span>
          Waking up the server — this can take a few seconds on the first request.
        </p>
      )}
    </div>
  );
}
