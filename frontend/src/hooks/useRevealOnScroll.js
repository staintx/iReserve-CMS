import { useEffect, useRef } from "react";

/**
 * Reveals elements marked `.ls-reveal` as they scroll into view.
 *
 * Progressive enhancement, deliberately: the CSS only hides anything once this
 * hook has set `data-ls-motion="on"` on the container. If JS never runs, or
 * IntersectionObserver is unavailable, or the visitor prefers reduced motion,
 * the page renders fully visible and nothing is lost.
 *
 * `signal` re-runs the scan. Landing content arrives asynchronously, so
 * elements that did not exist at mount must still be picked up — without this
 * they would keep the hidden state and never be revealed. Re-observing a
 * target already being observed is a no-op, and revealed elements are skipped.
 *
 * Returns a ref to attach to the scope containing the revealed elements.
 */
export default function useRevealOnScroll(signal) {
  const scopeRef = useRef(null);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;

    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    scope.dataset.lsMotion = "on";

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      // Fire slightly before the element's top edge arrives, so the settle
      // finishes about when it reaches comfortable reading position.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    scope
      .querySelectorAll(".ls-reveal:not(.is-visible)")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [signal]);

  return scopeRef;
}
