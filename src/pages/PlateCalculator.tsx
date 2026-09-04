import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MapPin } from 'lucide-react';
import { db } from '../data/db';
import { useSessionStore } from '../store/sessionStore';
import { ALL_PLATE_SIZES_KG, plateBreakdown } from '../lib/plates';
import { trimNum } from '../lib/format';
import { PlateDiagram } from '../components/PlateDiagram';

type BarChoice = '20' | '15' | 'custom';

export function PlateCalculator() {
  const routines = useLiveQuery(async () => (await db.routines.toArray()).filter((r) => !r.archived), []) ?? [];
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const activeSession = useLiveQuery(
    () => (activeSessionId ? db.sessions.get(activeSessionId) : undefined),
    [activeSessionId]
  );

  const [routineId, setRoutineId] = useState<string | null>(null);
  const effectiveRoutineId = routineId ?? activeSession?.routineId ?? routines[0]?.id ?? null;
  const routine = routines.find((r) => r.id === effectiveRoutineId);

  const [barChoice, setBarChoice] = useState<BarChoice>('20');
  const [customBar, setCustomBar] = useState('');
  const [total, setTotal] = useState('');

  const barWeight = barChoice === '20' ? 20 : barChoice === '15' ? 15 : parseFloat(customBar) || 0;
  const totalNum = parseFloat(total);
  const hasResult = total !== '' && !Number.isNaN(totalNum);
  const perSide = hasResult ? Math.max(0, (totalNum - barWeight) / 2) : 0;
  const inventory = routine?.plateInventory ?? ALL_PLATE_SIZES_KG;
  const { plates, remainder } = plateBreakdown(perSide, inventory);
  const shortOfBar = hasResult && totalNum < barWeight;

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-1 text-2xl font-bold">Plate Calculator</h1>
      <p className="mb-5 text-sm text-[var(--color-text-dim)]">
        Enter the total weight you want to lift — we'll work out what goes on each side.
      </p>

      {routines.length > 1 && (
        <div className="mb-4">
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">Gym</div>
          <div className="flex flex-wrap gap-1.5">
            {routines.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoutineId(r.id)}
                className={`flex items-center gap-1.5 rounded-full border-2 border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                  effectiveRoutineId === r.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'
                }`}
              >
                <MapPin size={13} /> {r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card-bevel mb-4 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-1.5 text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">Total weight</div>
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="0"
          className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3 text-center font-mono text-2xl font-bold outline-none"
        />
        <span className="mt-1 block text-center text-xs text-[var(--color-text-faint)]">kg, including the bar</span>
      </div>

      <div className="card-bevel mb-4 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-1.5 text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">Bar</div>
        <div className="flex gap-1.5">
          {(['20', '15', 'custom'] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => setBarChoice(choice)}
              className={`flex-1 rounded-xl border-2 border-[var(--color-border)] py-2 text-sm font-semibold transition active:scale-95 ${
                barChoice === choice
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'
              }`}
            >
              {choice === 'custom' ? 'Non-standard' : `${choice}kg`}
            </button>
          ))}
        </div>
        {barChoice === 'custom' && (
          <input
            type="number"
            inputMode="decimal"
            value={customBar}
            onChange={(e) => setCustomBar(e.target.value)}
            placeholder="Bar weight in kg"
            className="mt-2.5 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-center font-mono outline-none"
          />
        )}
      </div>

      {hasResult && (
        <div className="card-bevel rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          {shortOfBar ? (
            <p className="text-center text-sm text-[var(--color-amber)]">
              {trimNum(totalNum)}kg is less than the {trimNum(barWeight)}kg bar on its own.
            </p>
          ) : (
            <>
              <div className="mb-1 text-center font-mono text-xl font-bold">
                {trimNum(perSide)}kg
                <span className="ml-1.5 text-sm font-normal text-[var(--color-text-faint)]">each side</span>
              </div>
              <PlateDiagram plates={plates} />
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 text-xs text-[var(--color-text-faint)]">
                <span className="uppercase tracking-wide">Per side</span>
                {plates.length === 0 ? (
                  <span>—</span>
                ) : (
                  plates.map((p, i) => (
                    <span
                      key={i}
                      className="rounded-md border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono font-bold text-[var(--color-text)]"
                    >
                      {trimNum(p)}
                    </span>
                  ))
                )}
                {remainder > 0.01 && <span className="text-[var(--color-amber)]">+{trimNum(remainder)} short</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
