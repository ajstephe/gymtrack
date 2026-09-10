import { trimNum } from '../lib/format';
import type { SessionBest } from '../lib/calculations';

/** Compact bar chart of top-set weight per session — today's session (if any) stands out from
 * the rest so it's obvious at a glance whether today beats what came before. No charting library:
 * this renders inside every open ExerciseCard, and pulling recharts into that page's bundle for a
 * handful of bars isn't worth it. */
export function ProgressChart({ history }: { history: SessionBest[] }) {
  if (history.length === 0) return null;

  const todayStr = new Date().toDateString();
  const maxWeight = Math.max(...history.map((h) => h.weight), 1);

  return (
    <div className="mb-3">
      <div className="mb-1 flex h-14 items-end justify-between gap-1.5 border-b-2 border-[var(--color-border)] pb-0.5">
        {history.map((h, i) => {
          const isToday = new Date(h.date).toDateString() === todayStr;
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
              <div
                className={`w-full max-w-[26px] rounded-t-sm border-2 border-b-0 border-[var(--color-border)] ${
                  isToday ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-2)]'
                }`}
                style={{ height: `${Math.max(10, (h.weight / maxWeight) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-start justify-between gap-1.5">
        {history.map((h, i) => {
          const isToday = new Date(h.date).toDateString() === todayStr;
          return (
            <div key={i} className="flex-1 text-center">
              <div
                className={`font-mono text-[10px] font-bold tabular-nums ${
                  isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                }`}
              >
                {trimNum(h.weight)}
              </div>
              <div className="truncate text-[9px] text-[var(--color-text-faint)]">
                {isToday
                  ? 'Today'
                  : new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
