import type { ReactNode } from 'react';

export function EmptyState({ icon, title, sub }: { icon?: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-10 text-center">
      {icon && <div className="text-[var(--color-text-faint)]">{icon}</div>}
      <div className="font-medium text-[var(--color-text-dim)]">{title}</div>
      {sub && <div className="text-sm text-[var(--color-text-faint)]">{sub}</div>}
    </div>
  );
}
