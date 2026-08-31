import { useEffect, useRef } from 'react';
import { useDialogStore } from '../store/dialogStore';
import { useEscapeToClose } from '../lib/useEscapeToClose';
import { hapticImpact, hapticTap } from '../lib/haptics';

/** Themed stand-in for window.confirm(), mounted once at the app root. */
export function ConfirmDialog() {
  const { open, title, message, confirmLabel, cancelLabel, danger, settle } = useDialogStore();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEscapeToClose(open, () => settle(false));

  // Default focus lands on the safe action — Cancel for a destructive confirm, Confirm
  // otherwise — so a reflexive Return/Enter never fires the destructive path.
  useEffect(() => {
    if (!open) return;
    (danger ? cancelRef.current : confirmRef.current)?.focus();
  }, [open, danger]);

  function onTrapKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const focusFirst = document.activeElement === confirmRef.current;
    (focusFirst ? cancelRef.current : confirmRef.current)?.focus();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6"
      onClick={() => settle(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="card-bevel w-full max-w-[380px] rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onTrapKeyDown}
      >
        <h2 id="confirm-dialog-title" className="mb-1.5 text-lg font-bold">
          {title}
        </h2>
        {message && <p className="mb-4 text-sm text-[var(--color-text-dim)]">{message}</p>}
        <div className="flex gap-2">
          <button
            ref={cancelRef}
            onClick={() => {
              hapticTap();
              settle(false);
            }}
            className="flex-1 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 text-sm font-semibold transition active:scale-[0.97]"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
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
