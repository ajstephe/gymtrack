import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
          {label}
        </span>
        {icon && <span style={{ color: accent ?? 'var(--color-text-faint)' }}>{icon}</span>}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--color-text-dim)]">{sub}</div>}
    </div>
  );
}
