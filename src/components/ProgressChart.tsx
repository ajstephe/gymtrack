import { trimNum } from '../lib/format';
import type { SessionBest } from '../lib/calculations';

const WIDTH = 300;
const HEIGHT = 60;
const PAD_X = 10;
const PAD_Y = 8;

/** Compact line chart of top-set weight per session — today's session (if any) stands out from
 * the rest so it's obvious at a glance whether today beats what came before. No charting library:
 * this renders inside every open ExerciseCard, and pulling recharts into that page's bundle for a
 * handful of points isn't worth it. */
export function ProgressChart({ history }: { history: SessionBest[] }) {
  if (history.length === 0) return null;

  const todayStr = new Date().toDateString();
  const weights = history.map((h) => h.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = maxWeight - minWeight || 1;

  const points = history.map((h, i) => ({
    x: history.length === 1 ? WIDTH / 2 : PAD_X + (i / (history.length - 1)) * (WIDTH - PAD_X * 2),
    y: HEIGHT - PAD_Y - ((h.weight - minWeight) / range) * (HEIGHT - PAD_Y * 2),
    isToday: new Date(h.date).toDateString() === todayStr,
    weight: h.weight,
    date: h.date,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="mb-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-[60px] w-full">
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.isToday ? 5 : 3.5}
            fill={p.isToday ? 'var(--color-primary)' : 'var(--color-surface)'}
            stroke="var(--color-primary)"
            strokeWidth={2}
          />
        ))}
      </svg>
      <div className="flex items-start justify-between gap-1.5">
        {points.map((p, i) => (
          <div key={i} className="flex-1 text-center">
            <div
              className={`font-mono text-[10px] font-bold tabular-nums ${
                p.isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
              }`}
            >
              {trimNum(p.weight)}
            </div>
            <div className="truncate text-[9px] text-[var(--color-text-faint)]">
              {p.isToday ? 'Today' : new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
