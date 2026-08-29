import { useState } from 'react';
import { X } from 'lucide-react';
import { db, newId } from '../data/db';

export function LogBodyWeightSheet({
  sessionId,
  defaultUnit,
  onClose,
}: {
  sessionId?: string;
  defaultUnit: 'kg' | 'lb';
  onClose: () => void;
}) {
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lb'>(defaultUnit);

  async function save() {
    const w = parseFloat(weight);
    if (Number.isNaN(w)) return;
    await db.bodyWeights.add({
      id: newId('bw'),
      weight: w,
      unit,
      date: new Date().toISOString(),
      sessionId,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-[560px] rounded-t-3xl border-t-[3px] border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Log Body Weight</h2>
          <button onClick={onClose} className="text-[var(--color-text-faint)]" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="mb-3 flex gap-2">
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0"
            className="flex-1 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 font-mono text-lg font-bold outline-none"
          />
          <span className="flex overflow-hidden rounded-xl border-2 border-[var(--color-border)]">
            {(['kg', 'lb'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-3.5 py-2.5 text-sm font-semibold ${
                  unit === u ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-faint)]'
                }`}
              >
                {u}
              </button>
            ))}
          </span>
        </div>
        <button
          onClick={save}
          disabled={!weight}
          className="btn-glow-primary w-full rounded-xl py-2.5 text-sm disabled:opacity-40 disabled:shadow-none"
        >
          Save
        </button>
      </div>
    </div>
  );
}
