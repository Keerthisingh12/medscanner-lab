/**
 * HowItWorks.jsx
 * A visually subtle 5-step explanation of the search pipeline.
 * Matches the actual code flow for Loom alignment.
 */

export function HowItWorks() {
  const steps = [
    'Search a test',
    'Enter your pincode',
    'We check availability',
    'We calculate the final price',
    'Compare providers',
  ];

  return (
    <section className="how-it-works" aria-label="How MedScanner Labs works">
      <h2 className="how-it-works__heading">How it works</h2>
      <ol className="how-it-works__steps">
        {steps.map((step, i) => (
          <li key={step} className="how-it-works__step">
            <span className="how-it-works__step-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="how-it-works__step-text">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
