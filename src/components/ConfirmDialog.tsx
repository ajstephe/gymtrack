import { useDialogStore } from '../store/dialogStore';
import { hapticImpact, hapticTap } from '../lib/haptics';

/** Themed stand-in for window.confirm(), mounted once at the app root. */
export function ConfirmDialog() {
  const { open, title, message, confirmLabel, cancelLabel, danger, settle } = useDialogStore();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6"
      onClick={() => settle(false)}
    >
      <div
        className="card-bevel w-full max-w-[380px] rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1.5 text-lg font-bold">{title}</h2>
        {message && <p className="mb-4 text-sm text-[var(--color-text-dim)]">{message}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => {
              hapticTap();
              settle(false);
            }}
            className="flex-1 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 text-sm font-semibold transition active:scale-[0.97]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              if (danger) hapticImpact();
              else hapticTap();
              settle(true);
            }}
            className={`flex-1 rounded-xl py-2.5 text-sm transition active:scale-[0.97] ${danger ? 'btn-glow-pink' : 'btn-glow-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
