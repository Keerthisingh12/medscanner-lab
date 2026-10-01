/**
 * PackageTests.jsx
 * Renders the included_tests array as a wrapping list of chips.
 * Only rendered for item_type === 'package'.
 */

export function PackageTests({ tests }) {
  if (!tests || tests.length === 0) return null;

  return (
    <div className="package-tests">
      <p className="package-tests__label">Included tests</p>
      <ul className="package-tests__chips" aria-label="Included tests">
        {tests.map((test) => (
          <li key={test} className="package-tests__chip">
            {test}
          </li>
        ))}
      </ul>
    </div>
  );
}
