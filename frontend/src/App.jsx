/**
 * App.jsx
 * Root component. Manages search state, runs the API call, handles all states.
 *
 * Optional features implemented:
 * - AbortController: older requests cannot overwrite newer ones.
 * - URL params: ?search_query=...&pincode=... auto-runs on load; updated via
 *   history.replaceState on each search. No router library used.
 * - Quick-try chips (delegated to SearchForm).
 * - Delayed server cold-start notice (delegated to LoadingState).
 * - How It Works section.
 * - meta.test_available_in_other_pincodes hint in EmptyState.
 */

import { useState, useRef, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { searchLabs } from './api.js';
import { SearchForm }  from './components/SearchForm.jsx';
import { ResultsList } from './components/ResultsList.jsx';
import { LoadingState } from './components/LoadingState.jsx';
import { EmptyState }   from './components/EmptyState.jsx';
import { ErrorState }   from './components/ErrorState.jsx';
import { HowItWorks }  from './components/HowItWorks.jsx';

// Read initial search params from the URL (for shareable links)
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    query:   params.get('search_query') ?? '',
    pincode: params.get('pincode') ?? '',
  };
}

export default function App() {
  const initial = getUrlParams();

  const [status, setStatus]       = useState('idle'); // idle | loading | results | empty | error
  const [results, setResults]     = useState(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [lastSearch, setLastSearch] = useState(null); // { query, pincode } for retry
  const [isLoading, setIsLoading] = useState(false);

  // AbortController ref: cancel in-flight request when a new search fires
  const abortRef = useRef(null);

  async function runSearch(query, pincode) {
    // Cancel any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLastSearch({ query, pincode });
    setIsLoading(true);
    setStatus('loading');
    setResults(null);

    // Update the URL so the search is shareable
    const params = new URLSearchParams({ search_query: query, pincode });
    window.history.replaceState(null, '', '?' + params.toString());

    try {
      const data = await searchLabs(query, pincode, controller.signal);

      if (data.count === 0) {
        setStatus('empty');
        setResults(data);
      } else {
        setStatus('results');
        setResults(data);
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // request was superseded; ignore
      setErrorMsg(err.message || 'Unknown error.');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-run search if URL params are present on page load
  useEffect(() => {
    if (initial.query && initial.pincode) {
      runSearch(initial.query, initial.pincode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRetry() {
    if (lastSearch) {
      runSearch(lastSearch.query, lastSearch.pincode);
    }
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="site-header">
        <div className="container">
          <a href="/" className="site-header__logo" aria-label="MedScanner Labs home">
            <Activity
              className="site-header__logo-icon"
              size={28}
              aria-hidden="true"
            />
            <div className="site-header__brand">
              <span className="site-header__name">MedScanner Labs</span>
              <span className="site-header__label">Diagnostic Price Comparison</span>
            </div>
          </a>
        </div>
      </header>

      {/* ── Hero + Search ───────────────────────────────────────── */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="container">
          <h1 id="hero-heading" className="hero__heading">
            Compare lab test prices near you
          </h1>
          <p className="hero__subtext">
            Find available diagnostic tests and packages by pincode and compare
            their final prices.
          </p>

          <SearchForm
            onSearch={runSearch}
            isLoading={isLoading}
            initialQuery={initial.query}
            initialPincode={initial.pincode}
          />
        </div>
      </section>

      {/* ── Results region (aria-live so screen readers announce updates) ── */}
      <main>
        <div className="container">
          <div aria-live="polite" aria-atomic="false">
            {status === 'loading' && <LoadingState />}

            {status === 'results' && results && (
              <ResultsList data={results} />
            )}

            {status === 'empty' && results && (
              <EmptyState
                pincode={results.query?.pincode}
                testAvailableElsewhere={
                  results.meta?.test_available_in_other_pincodes ?? false
                }
              />
            )}

            {status === 'error' && (
              <ErrorState message={errorMsg} onRetry={handleRetry} />
            )}
          </div>

          <HowItWorks />
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="container">
          <p>Prices shown come from a sample dataset for demonstration.</p>
        </div>
      </footer>
    </>
  );
}
