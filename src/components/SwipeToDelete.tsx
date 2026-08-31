import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Trash2, MoreVertical } from 'lucide-react';
import { hapticImpact } from '../lib/haptics';
import { confirmDialog } from '../store/dialogStore';

const REVEAL_WIDTH = 76;
const TRIGGER_RATIO = 0.5;
const AXIS_THRESHOLD = 6;

// Only one row's delete action should stay revealed at a time — opening a new one closes
// whatever else was left open, matching Mail/Reminders. Module-scoped since rows across
// different lists (gyms, exercises, sets) never need to interact, just siblings within one.
const openRows = new Set<() => void>();

function closeOtherRows(exceptCloser: () => void) {
  for (const close of openRows) {
    if (close !== exceptCloser) close();
  }
}

/**
 * Wraps a list row with an iOS-style swipe-left-to-reveal-delete gesture. The reveal + explicit
 * tap on the red action is treated as the confirmation — no separate confirm() dialog on top,
 * matching Mail/Reminders. Pointer capture is deferred until horizontal intent is confirmed so
 * vertical scrolling of the list is never hijacked.
 *
 * The swipe is a fast path, not the only path: a small always-visible "more" button offers the
 * same delete behind a themed confirm dialog, so the action stays reachable by keyboard, mouse
 * click, or anyone who never discovers the gesture — and stays discoverable at a glance.
 */
export function SwipeToDelete({
  onDelete,
  ariaLabel,
  confirmTitle,
  railBg = 'var(--color-surface)',
  children,
}: {
  onDelete: () => void;
  ariaLabel: string;
  confirmTitle?: string;
  /** Background of the row's own draggable layer — match the row's surface color or the red
   * delete panel underneath shows through both the "more options" area and the sliver where
   * content's own rounded corner doesn't quite meet it. */
  railBg?: string;
  children: ReactNode;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Mirrors `dragX` synchronously — pointerup needs the live value, not whatever was captured in
  // the render closure this particular handler instance was created from (state updates from the
  // preceding pointermoves may not have committed yet when pointerup fires in quick succession).
  const dragXRef = useRef(0);
  const start = useRef<{ x: number; y: number; baseX: number } | null>(null);
  const axis = useRef<'x' | 'y' | null>(null);
  const closerRef = useRef<() => void>(() => {});

  function setDrag(next: number) {
    dragXRef.current = next;
    setDragX(next);
  }

  useEffect(() => {
    const closer = () => setDrag(0);
    closerRef.current = closer;
    openRows.add(closer);
    return () => {
      openRows.delete(closer);
    };
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY, baseX: dragXRef.current };
    axis.current = null;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (axis.current === null) {
      if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis.current === 'x') {
        closeOtherRows(closerRef.current);
        try {
          (e.target as Element).setPointerCapture?.(e.pointerId);
        } catch {
          // best-effort
        }
      }
    }
    if (axis.current !== 'x') return;
    setDrag(Math.min(0, Math.max(-REVEAL_WIDTH, start.current.baseX + dx)));
  }

  function onPointerUp() {
    if (axis.current === 'x') {
      setDrag(Math.abs(dragXRef.current) > REVEAL_WIDTH * TRIGGER_RATIO ? -REVEAL_WIDTH : 0);
    }
    start.current = null;
    axis.current = null;
    setDragging(false);
  }

  function onContentClickCapture(e: React.MouseEvent) {
    if (dragXRef.current !== 0) {
      e.preventDefault();
      e.stopPropagation();
      setDrag(0);
    }
  }

  async function handleMenuDelete() {
    const confirmed = await confirmDialog({
      title: confirmTitle ?? `${ariaLabel}?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    hapticImpact();
    onDelete();
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <button
        onClick={() => {
          hapticImpact();
          setDrag(0);
          onDelete();
        }}
        aria-label={ariaLabel}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-[var(--color-danger)] text-white"
        style={{ width: REVEAL_WIDTH }}
      >
        <Trash2 size={17} />
      </button>
      <div
        className="flex items-stretch"
        style={{
          background: railBg,
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onContentClickCapture}
          className="min-w-0 flex-1 cursor-grab select-none active:cursor-grabbing"
          style={{ touchAction: 'pan-y' }}
        >
          {children}
        </div>
        <button
          onClick={handleMenuDelete}
          aria-label={`${ariaLabel} — more options`}
          className="shrink-0 cursor-pointer px-2 text-[var(--color-text-faint)] transition active:scale-90"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
}
