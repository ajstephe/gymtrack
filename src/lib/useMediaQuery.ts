import { useEffect, useState } from 'react';

/** Live-tracks a CSS media query (e.g. a width breakpoint) via matchMedia, re-rendering on change —
 * for layout decisions React itself needs to make (which elements mount), not things plain CSS
 * media queries already handle on their own. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
