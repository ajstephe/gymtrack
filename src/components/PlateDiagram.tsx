import { plateColor, plateHeight, type PlateUnit } from '../lib/plates';

/** One side's plates, biggest-first (as returned by plateBreakdown) — mirrored around a center bar. */
export function PlateDiagram({ plates, unit }: { plates: number[]; unit: PlateUnit }) {
  const leftToRight = [...plates].reverse();

  return (
    <div className="flex items-center justify-center gap-[2px] py-1">
      {leftToRight.map((w, i) => (
        <Plate key={`l${i}`} weight={w} unit={unit} />
      ))}
      <span className="mx-1 h-2.5 w-9 shrink-0 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-surface-2)]" />
      {plates.map((w, i) => (
        <Plate key={`r${i}`} weight={w} unit={unit} />
      ))}
    </div>
  );
}

function Plate({ weight, unit }: { weight: number; unit: PlateUnit }) {
  return (
    <span
      className="w-2.5 shrink-0 rounded-[3px] border-2 border-[var(--color-border)]"
      style={{ height: plateHeight(weight, unit), background: plateColor(weight, unit) }}
      aria-hidden="true"
    />
  );
}
