import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { useRestTimerStore, playRestDoneChime } from '../store/restTimerStore';
import { formatDuration } from '../lib/format';

export function RestTimer() {
  const { endsAt, duration, label, addSeconds, stop } = useRestTimerStore();
  const [remainingSec, setRemainingSec] = useState(0);
  const chimedRef = useRef(false);

  useEffect(() => {
    if (endsAt == null) return;
    chimedRef.current = false;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSec(remaining);
      if (remaining <= 0 && !chimedRef.current) {
        chimedRef.current = true;
        playRestDoneChime();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  if (endsAt == null) return null;

  const isDone = remainingSec <= 0;
  const progress = Math.min(1, Math.max(0, 1 - remainingSec / duration));

  return (
    <div className="fixed inset-x-0 bottom-[64px] z-40 mx-auto max-w-[560px] px-3 pb-2">
      <div
        className={`card-bevel relative overflow-hidden rounded-2xl border-2 border-[var(--color-border)] ${
          isDone ? 'bg-[var(--color-lime)]' : 'bg-[var(--color-surface)]'
        }`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-primary)]/15 transition-[width]"
          style={{ width: `${progress * 100}%` }}
        />
        <div className="relative flex items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
              {isDone ? 'Rest done' : `Resting${label ? ` · ${label}` : ''}`}
            </div>
            <div className={`font-mono text-2xl font-semibold tabular-nums ${isDone ? 'text-[var(--color-text)]' : ''}`}>
              {isDone ? 'GO' : formatDuration(remainingSec)}
            </div>
          </div>
          {!isDone && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => addSeconds(-15)}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] active:scale-95"
                aria-label="Subtract 15 seconds"
              >
                <Minus size={16} />
              </button>
              <button
                onClick={() => addSeconds(15)}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] active:scale-95"
                aria-label="Add 15 seconds"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
          <button
            onClick={stop}
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] active:scale-95"
            aria-label="Dismiss timer"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
