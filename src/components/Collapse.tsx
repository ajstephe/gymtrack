import type { ReactNode } from 'react';

/**
 * Smoothly animates its children open/closed using the CSS grid-rows trick —
 * no JS height measurement needed, and content stays mounted so state (form
 * inputs, scroll position) survives a collapse.
 */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
