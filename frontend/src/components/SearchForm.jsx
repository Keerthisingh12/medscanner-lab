/**
 * SearchForm.jsx
 * The main search form. Handles:
 * - Client-side validation (empty query, invalid pincode) before calling API
 * - Digit-only pincode input
 * - Enter key submits
 * - Disabled + spinner while loading
 * - Quick-try chips to pre-fill from dataset
 */

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

// Quick-try chips use only real dataset values
const QUICK_TRIES = [
  { label: 'Lipid Profile – 110001', query: 'Lipid Profile', pincode: '110001' },
  { label: 'Lipid Profile – 560034', query: 'Lipid Profile', pincode: '560034' },
  { label: 'MRI Brain – 560034',     query: 'MRI Brain',     pincode: '560034' },
];

export function SearchForm({ onSearch, isLoading, initialQuery = '', initialPincode = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [pincode, setPincode] = useState(initialPincode);
  const [errors, setErrors] = useState({});

  // Sync if parent passes new initial values (e.g., from URL params)
  useEffect(() => {
    setQuery(initialQuery);
    setPincode(initialPincode);
  }, [initialQuery, initialPincode]);

  function validate() {
    const newErrors = {};
    if (!query.trim()) {
      newErrors.query = 'Please enter a test name.';
    }
    if (!pincode) {
      newErrors.pincode = 'Please enter a pincode.';
    } else if (!/^\d{6}$/.test(pincode)) {
      newErrors.pincode = 'Pincode must be exactly 6 digits.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (validate()) {
      onSearch(query.trim(), pincode);
    }
  }

  function handlePincodeChange(e) {
    // Allow digits only; ignore other characters
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
    if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: undefined }));
  }

  function handleQueryChange(e) {
    setQuery(e.target.value);
    if (errors.query) setErrors((prev) => ({ ...prev, query: undefined }));
  }

  function applyQuickTry(chip) {
    setQuery(chip.query);
    setPincode(chip.pincode);
    setErrors({});
    // Submit immediately after setting state via the form values
    onSearch(chip.query, chip.pincode);
  }

  return (
    <>
      {/* Quick-try chips */}
      <div className="quick-try">
        <span className="quick-try__label">Try:</span>
        {QUICK_TRIES.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className="quick-try__chip"
            onClick={() => applyQuickTry(chip)}
            disabled={isLoading}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <form
        className="search-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Search for lab tests"
        role="search"
      >
        <div className="search-form__grid">
          {/* Test Name */}
          <div className="form-field">
            <label htmlFor="search-query">Test Name</label>
            <input
              id="search-query"
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search for a test, e.g. Lipid Profile"
              autoComplete="off"
              aria-describedby={errors.query ? 'query-error' : undefined}
              aria-invalid={errors.query ? 'true' : 'false'}
            />
            {errors.query && (
              <span id="query-error" className="form-field__error" role="alert">
                {errors.query}
              </span>
            )}
          </div>

          {/* Pincode */}
          <div className="form-field">
            <label htmlFor="pincode">Pincode</label>
            <input
              id="pincode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={handlePincodeChange}
              placeholder="Enter 6-digit pincode"
              autoComplete="postal-code"
              aria-describedby={errors.pincode ? 'pincode-error' : undefined}
              aria-invalid={errors.pincode ? 'true' : 'false'}
            />
            {errors.pincode && (
              <span id="pincode-error" className="form-field__error" role="alert">
                {errors.pincode}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            id="search-submit-btn"
            type="submit"
            className="search-btn"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Searching…
              </>
            ) : (
              <>
                <Search size={16} aria-hidden="true" />
                Search
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
