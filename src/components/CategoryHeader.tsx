import { createElement, type PointerEventHandler } from 'react';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { categoryColor } from '../lib/categoryColors';
import { categoryIcon } from '../lib/categoryIcons';

export function CategoryHeader({
  category,
  count,
  collapsed,
  onToggle,
  onDragPointerDown,
  dragging,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  category: string;
  count?: number;
  collapsed?: boolean;
  onToggle?: () => void;
  /** Present when this header can be picked up and dragged to reorder — attach to the header's
   * own onPointerDown so a held press (not a quick tap) engages the drag. */
  onDragPointerDown?: PointerEventHandler<HTMLButtonElement>;
  /** True while this specific header is the one currently being dragged — lifts it visually. */
  dragging?: boolean;
  /** Non-gesture fallback for reordering, mirroring the up/down buttons exercise rows already
   * have — present only when there's more than one category to reorder against. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const color = categoryColor(category);
  const showReorderArrows = onMoveUp != null && onMoveDown != null;

  const inner = (
    <>
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
        style={{ background: `${color}22`, borderColor: color }}
      >
        {/* createElement rather than a JSX tag from a variable: categoryIcon() returns a
            reference to one of a fixed set of existing icon components, not a new component
            definition, but the JSX-tag form is indistinguishable from that at a glance. */}
        {createElement(categoryIcon(category), { size: 13, style: { color }, strokeWidth: 2.4 })}
      </span>
      <h2 className="text-sm font-extrabold tracking-wide" style={{ color }}>
        {category.toUpperCase()}
      </h2>
      {count != null && (
        <span className="text-xs font-medium text-[var(--color-text-faint)]">{count}</span>
      )}
      <span className="h-px flex-1" style={{ background: `${color}33` }} />
      {onDragPointerDown && (
        <GripVertical size={14} className="shrink-0 text-[var(--color-text-faint)] opacity-40" />
      )}
      {onToggle && (
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--color-text-faint)] transition-transform ${collapsed ? '' : 'rotate-180'}`}
        />
      )}
    </>
  );

  const toggleButton = onToggle ? (
    <button
      onClick={onToggle}
      onPointerDown={onDragPointerDown}
      className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-1 text-left transition active:scale-[0.98] ${
        dragging ? 'card-bevel bg-[var(--color-surface)]' : ''
      }`}
      style={dragging ? { touchAction: 'none' } : undefined}
    >
      {inner}
    </button>
  ) : (
    <div className="flex min-w-0 flex-1 items-center gap-2 px-1">{inner}</div>
  );

  return (
    <div className="mb-2.5 flex items-center gap-1">
      {toggleButton}
      {showReorderArrows && (
        <div className="flex shrink-0 flex-col">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="rounded p-1 text-[var(--color-text-faint)] transition active:scale-90 disabled:opacity-20"
            aria-label={`Move ${category} up`}
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="rounded p-1 text-[var(--color-text-faint)] transition active:scale-90 disabled:opacity-20"
            aria-label={`Move ${category} down`}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
