import { useRef, useState } from 'react';
import { X } from 'lucide-react';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DIST = 40;
const MOVE_THRESHOLD = 4;

interface GestureState {
  mode: 'none' | 'pan' | 'pinch';
  startDist: number;
  startScale: number;
  startTx: number;
  startTy: number;
  startX: number;
  startY: number;
  moved: boolean;
}

const IDLE_GESTURE: GestureState = {
  mode: 'none',
  startDist: 0,
  startScale: 1,
  startTx: 0,
  startTy: 0,
  startX: 0,
  startY: 0,
  moved: false,
};

/** Full-screen photo viewer with pinch-to-zoom, double-tap-to-zoom, and pan — the app disables native pinch-zoom, so this replaces it for photo viewing. */
export function PhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isGesturing, setIsGesturing] = useState(false);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gesture = useRef<GestureState>({ ...IDLE_GESTURE });
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function clamp(newScale: number, newTx: number, newTy: number) {
    const el = containerRef.current;
    if (!el) return { tx: newTx, ty: newTy };
    const maxX = (el.clientWidth * (newScale - 1)) / 2;
    const maxY = (el.clientHeight * (newScale - 1)) / 2;
    return {
      tx: Math.max(-maxX, Math.min(maxX, newTx)),
      ty: Math.max(-maxY, Math.min(maxY, newTy)),
    };
  }

  function resetZoom() {
    setScale(1);
    setTx(0);
    setTy(0);
  }

  function zoomAt(clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const offsetX = (rect.width / 2 - (clientX - rect.left)) * (DOUBLE_TAP_SCALE - 1);
    const offsetY = (rect.height / 2 - (clientY - rect.top)) * (DOUBLE_TAP_SCALE - 1);
    const c = clamp(DOUBLE_TAP_SCALE, offsetX, offsetY);
    setScale(DOUBLE_TAP_SCALE);
    setTx(c.tx);
    setTy(c.ty);
  }

  function handlePointerDown(e: React.PointerEvent) {
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Pointer capture is best-effort — some environments reject it for synthetic or edge-case pointers.
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setIsGesturing(true);

    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      gesture.current = {
        ...IDLE_GESTURE,
        mode: 'pinch',
        startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
        startScale: scale,
        startTx: tx,
        startTy: ty,
      };
    } else if (pointers.current.size === 1) {
      gesture.current = {
        ...IDLE_GESTURE,
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        startTx: tx,
        startTy: ty,
      };
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;

    if (g.mode === 'pinch' && pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const newScale = Math.max(1, Math.min(MAX_SCALE, g.startScale * (dist / g.startDist)));
      const c = clamp(newScale, g.startTx, g.startTy);
      setScale(newScale);
      setTx(c.tx);
      setTy(c.ty);
    } else if (g.mode === 'pan' && pointers.current.size === 1 && scale > 1) {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) g.moved = true;
      const c = clamp(scale, g.startTx + dx, g.startTy + dy);
      setTx(c.tx);
      setTy(c.ty);
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;

    if (pointers.current.size === 1) {
      const remaining = [...pointers.current.values()][0];
      gesture.current = { ...IDLE_GESTURE, mode: 'pan', startX: remaining.x, startY: remaining.y, startTx: tx, startTy: ty, moved: true };
      return;
    }

    if (pointers.current.size === 0) {
      const wasTap = g.mode === 'pan' && !g.moved;
      gesture.current = { ...IDLE_GESTURE };
      setIsGesturing(false);

      if (wasTap) {
        const now = Date.now();
        const isDoubleTap =
          lastTap.current != null &&
          now - lastTap.current.time < DOUBLE_TAP_MS &&
          Math.hypot(e.clientX - lastTap.current.x, e.clientY - lastTap.current.y) < DOUBLE_TAP_DIST;

        if (isDoubleTap) {
          if (scale > 1) resetZoom();
          else zoomAt(e.clientX, e.clientY);
          lastTap.current = null;
        } else {
          lastTap.current = { time: now, x: e.clientX, y: e.clientY };
        }
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex touch-none items-center justify-center overflow-hidden bg-black/95"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <button
        onClick={onClose}
        className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
        style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
        aria-label="Close"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt=""
        draggable={false}
        className="max-h-full max-w-full select-none object-contain"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: isGesturing ? 'none' : 'transform 0.15s ease-out',
        }}
      />
    </div>
  );
}
