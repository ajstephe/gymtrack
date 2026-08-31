import { useState } from 'react';
import { X } from 'lucide-react';
import type { WeightUnit } from '../data/types';
import { CategorySelect } from './CategorySelect';
import { UNIT_OPTIONS } from '../lib/unitOptions';
import { useEscapeToClose } from '../lib/useEscapeToClose';

export interface NewExerciseForm {
  name: string;
  category: string;
  unit: WeightUnit;
  setupNote: string;
}

export function AddExerciseSheet({
  defaultCategory,
  categories,
  onAdd,
  onClose,
}: {
  defaultCategory: string;
  categories: string[];
  onAdd: (form: NewExerciseForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<NewExerciseForm>({ name: '', category: defaultCategory, unit: 'kg', setupNote: '' });
  useEscapeToClose(true, onClose);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-[560px] rounded-t-3xl border-t-[3px] border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add Exercise</h2>
          <button onClick={onClose} className="text-[var(--color-text-faint)] transition active:scale-90" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Exercise name"
            className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
          />
          <CategorySelect
            categories={categories}
            value={form.category}
            onChange={(category) => setForm((f) => ({ ...f, category }))}
          />
          <input
            value={form.setupNote}
            onChange={(e) => setForm((f) => ({ ...f, setupNote: e.target.value }))}
            placeholder="Setup note (seat/pin, optional)"
            className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
          />
          <select
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as WeightUnit }))}
            className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => onAdd(form)}
            disabled={!form.name.trim()}
            className="btn-glow-primary mt-1 rounded-lg py-2.5 text-sm transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
          >
            Add to Workout
          </button>
        </div>
      </div>
    </div>
  );
}
