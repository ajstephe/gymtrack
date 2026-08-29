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
    <div
      className="card-bevel flex-1 rounded-2xl border-2 border-[var(--color-border)] p-3.5"
      style={{ background: accent ? `color-mix(in srgb, ${accent} 22%, var(--color-surface))` : 'var(--color-surface)' }}
    >
      <div className="flex items-center justify-between">
        <span className="whitespace-nowrap text-[10px] font-bold uppercase text-[var(--color-text-dim)]">
          {label}
        </span>
        {icon && <span style={{ color: accent ?? 'var(--color-text-faint)' }}>{icon}</span>}
      </div>
      <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs font-semibold text-[var(--color-text-dim)]">{sub}</div>}
    </div>
  );
}
