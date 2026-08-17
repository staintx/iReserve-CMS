import { toneOf } from "./tone";

/**
 * A workflow milestone, not a toast and not a modal.
 *
 * Used where an action ends a flow and the user's next question is
 * "what happens now?" — inquiry submitted, request sent. It is a
 * whole surface because it has to answer four things a toast cannot:
 * what happened, what it does *not* mean, what comes next, and what
 * to do now.
 *
 * Composed from parts rather than configured through props, because
 * the sections genuinely differ per flow (a package booking has a
 * price summary; a custom quote has nothing to price yet).
 */
export default function CompletionState({ tone = "success", title, lead, reference, children }) {
  const { icon: Icon, tint } = toneOf(tone);

  return (
    <div className="fb fb-done">
      <div className="fb-done__head">
        <div className={`fb-done__badge fb-done__badge--in ${tint}`} aria-hidden="true">
          <Icon />
        </div>
        {/* The live region is the heading, so a screen reader hears
            the outcome on arrival rather than only the page title. */}
        <h1 className="fb-done__title" role="status">
          {title}
        </h1>
        {lead ? <p className="fb-done__lead">{lead}</p> : null}
        {reference ? (
          <p className="fb-done__ref">
            <span className="fb-done__ref-label">Reference</span>
            <span className="fb-done__ref-value">{reference}</span>
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function CompletionSection({ title, children }) {
  return (
    <section className="fb-done__section">
      <h2 className="fb-done__section-title">{title}</h2>
      <div className="fb-done__section-body">{children}</div>
    </section>
  );
}

/**
 * @param {number} [current]  1-based index of the step the request is
 *   actually sitting at, so the list shows a position rather than a
 *   generic brochure of the process.
 */
export function CompletionSteps({ steps, current }) {
  return (
    <ol className="fb-done__steps">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className={`fb-done__step${current === index + 1 ? " fb-done__step--current" : ""}`}
          aria-current={current === index + 1 ? "step" : undefined}
        >
          <p className="fb-done__step-title">{step.title}</p>
          <p className="fb-done__step-body">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function CompletionRow({ label, value, total = false }) {
  return (
    <div className={`fb-done__row${total ? " fb-done__row--total" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function CompletionActions({ children }) {
  return <div className="fb-done__actions">{children}</div>;
}
