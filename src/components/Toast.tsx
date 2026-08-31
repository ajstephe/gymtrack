import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

const DURATION_MS = 2600;

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

/** Transient toast, mounted once at the app root. Stand-in for window.alert(). */
export function Toast() {
  const toast = useToastStore((s) => s.toast);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => dismiss(toast.id), DURATION_MS);
    return () => clearTimeout(id);
  }, [toast, dismiss]);

  if (!toast) return null;
  const Icon = ICONS[toast.kind];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 safe-top pt-3">
      <div
        key={toast.id}
        className="toast-pop-in card-bevel pointer-events-auto flex max-w-[380px] items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm font-medium"
      >
        <Icon
          size={16}
          className={`shrink-0 ${
            toast.kind === 'success'
              ? 'text-[var(--color-primary)]'
              : toast.kind === 'error'
                ? 'text-[var(--color-danger)]'
                : 'text-[var(--color-text-faint)]'
          }`}
        />
        {toast.message}
      </div>
    </div>
  );
}
