import { ChevronDown } from 'lucide-react';
import { categoryColor } from '../lib/categoryColors';
import { categoryIcon } from '../lib/categoryIcons';

export function CategoryHeader({
  category,
  count,
  collapsed,
  onToggle,
}: {
  category: string;
  count?: number;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const color = categoryColor(category);
  const Icon = categoryIcon(category);

  const inner = (
    <>
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ background: `${color}22` }}
      >
        <Icon size={13} style={{ color }} strokeWidth={2.4} />
      </span>
      <h2 className="text-sm font-extrabold tracking-wide" style={{ color }}>
        {category.toUpperCase()}
      </h2>
      {count != null && (
        <span className="text-xs font-medium text-[var(--color-text-faint)]">{count}</span>
      )}
      <span className="h-px flex-1" style={{ background: `${color}33` }} />
      {onToggle && (
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--color-text-faint)] transition-transform ${collapsed ? '' : 'rotate-180'}`}
        />
      )}
    </>
  );

  if (onToggle) {
    return (
      <button onClick={onToggle} className="mb-2.5 flex w-full items-center gap-2 px-1 text-left">
        {inner}
      </button>
    );
  }

  return <div className="mb-2.5 flex items-center gap-2 px-1">{inner}</div>;
}
