import type { ReactNode } from 'react';
import { useOutlet } from 'react-router-dom';
import { useMediaQuery } from '../lib/useMediaQuery';

interface SplitPaneProps {
  /** The index-route content (e.g. the exercise/history list). */
  list: ReactNode;
  /** Shown in the detail pane on wide screens when nothing is selected yet. */
  placeholder: ReactNode;
}

/**
 * Shared list+detail shell for a route with a nested `:id` child (e.g. `/exercises` +
 * `/exercises/:exerciseId`). Narrow screens render exactly one pane at a time — the list on the
 * index route, the detail page via Outlet on the nested route — matching single-pane behavior
 * byte for byte. Wide screens show both side by side; since this component is the parent route's
 * own element, it stays mounted across index <-> detail navigation (only the Outlet's child
 * swaps), so the list never remounts or loses scroll position when a different item is selected.
 */
export function SplitPane({ list, placeholder }: SplitPaneProps) {
  const isWide = useMediaQuery('(min-width: 768px)');
  const outlet = useOutlet();

  if (!isWide) {
    return <>{outlet ?? list}</>;
  }

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="w-[340px] shrink-0 overflow-y-auto border-r-2 border-[var(--color-border)]">{list}</div>
      <div className="min-h-0 flex-1 overflow-y-auto">{outlet ?? placeholder}</div>
    </div>
  );
}
