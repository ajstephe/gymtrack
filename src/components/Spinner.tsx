export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 pt-16 text-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      {label && <p className="text-sm text-[var(--color-text-faint)]">{label}</p>}
    </div>
  );
}
