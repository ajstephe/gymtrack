import { useRef, useState, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { hapticImpact } from '../lib/haptics';

const REVEAL_WIDTH = 76;
const TRIGGER_RATIO = 0.5;
const AXIS_THRESHOLD = 6;

/**
 * Wraps a list row with an iOS-style swipe-left-to-reveal-delete gesture. The reveal + explicit
 * tap on the red action is treated as the confirmation — no separate confirm() dialog on top,
 * matching Mail/Reminders. Pointer capture is deferred until horizontal intent is confirmed so
 * vertical scrolling of the list is never hijacked.
 */
export function SwipeToDelete({
  onDelete,
  ariaLabel,
  children,
}: {
  onDelete: () => void;
  ariaLabel: string;
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

  function setDrag(next: number) {
    dragXRef.current = next;
    setDragX(next);
  }

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

  return (
    <div className="relative overflow-hidden rounded-xl">
      <button
        onClick={() => {
          hapticImpact();
          setDrag(0);
          onDelete();
        }}
        aria-label={ariaLabel}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-[var(--color-danger)] text-white"
        style={{ width: REVEAL_WIDTH }}
      >
        <Trash2 size={17} />
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onContentClickCapture}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  );
}
