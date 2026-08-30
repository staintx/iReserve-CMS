import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query from React.
 *
 * Most responsive behaviour in this app belongs in Tailwind variants, and
 * should stay there. This is for the cases where a breakpoint changes *what
 * is rendered*, not how it looks — the manager calendar's week view, for
 * instance, cannot be made to work in seven 40px columns, so below `sm` the
 * component renders a different view rather than a squeezed one.
 *
 * Returns `false` during the first render on a server or in any environment
 * without `matchMedia`, then corrects itself on mount.
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const list = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
