import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { hapticTap } from './haptics';

const LONG_PRESS_MS = 350;
const MOVE_CANCEL_PX = 8;
const FLIP_MS = 220;

/**
 * Press-and-hold-to-drag reordering for a vertical list of blocks (e.g. category sections) whose
 * heights vary and aren't known in advance. A held press with minimal movement engages drag mode;
 * a quick tap is left alone so the item's own onClick (e.g. expand/collapse) still fires — except
 * `justDraggedRef` is flipped true for one tick right after a real drag ends, so a caller can
 * swallow the synthetic click a completed drag would otherwise also trigger.
 *
 * Reordering compares the pointer's Y against each *other* item's actual measured midpoint
 * (not a fixed step size), so it stays correct when items are different heights — a collapsed
 * category next to an expanded one, for instance. Non-dragged items animate to their new slot
 * with a small FLIP (measure-before, invert, play) rather than snapping instantly.
 */
export function useDragReorder<T>(items: T[], keyFor: (item: T) => string, onReorder: (keys: string[]) => void) {
  const incomingKeys = items.map(keyFor);
  const [order, setOrder] = useState<string[]>(incomingKeys);
  const [prevKeys, setPrevKeys] = useState(incomingKeys);

  // Adopt the incoming order whenever it actually differs — React's documented "storing
  // information from previous renders" pattern, rather than an effect that would apply it one
  // render late. This has to be a plain adopt, not a "keep local order, just reconcile
  // added/removed" merge: the persisted category order loads asynchronously, so the first render
  // or two see the natural (unordered) sequence before the real one arrives — a merge would just
  // filter that stale natural order against itself and silently discard the real one.
  if (incomingKeys.join(' ') !== prevKeys.join(' ')) {
    setPrevKeys(incomingKeys);
    setOrder(incomingKeys);
  }

  const orderRef = useRef(order);
  useLayoutEffect(() => {
    orderRef.current = order;
  }, [order]);

  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);
  const draggingKeyRef = useRef<string | null>(null);
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());
  const prevRects = useRef<Map<string, DOMRect>>(new Map());
  const longPressTimer = useRef<number | null>(null);
  const justDraggedRef = useRef(false);
  const drag = useRef<{ key: string; pointerId: number; startClientY: number } | null>(null);

  function registerNode(key: string) {
    return (el: HTMLElement | null) => {
      if (el) nodeRefs.current.set(key, el);
      else nodeRefs.current.delete(key);
    };
  }

  function captureRects() {
    const map = new Map<string, DOMRect>();
    for (const [k, el] of nodeRefs.current) map.set(k, el.getBoundingClientRect());
    prevRects.current = map;
  }

  // FLIP: whenever the order changes, animate every non-dragged item from where it *was* to
  // where it now is, instead of letting it silently snap to its new layout position.
  useLayoutEffect(() => {
    for (const [k, el] of nodeRefs.current) {
      if (k === draggingKeyRef.current) continue;
      const prev = prevRects.current.get(k);
      if (!prev) continue;
      const next = el.getBoundingClientRect();
      const deltaY = prev.top - next.top;
      if (Math.abs(deltaY) < 0.5) continue;
      el.style.transition = 'none';
      el.style.transform = `translateY(${deltaY}px)`;
      void el.getBoundingClientRect(); // force reflow so the instant jump above actually paints first
      requestAnimationFrame(() => {
        el.style.transition = `transform ${FLIP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        el.style.transform = '';
      });
    }
  }, [order]);

  function cancelLongPress() {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function beginDrag(key: string, pointerId: number, clientY: number) {
    captureRects();
    drag.current = { key, pointerId, startClientY: clientY };
    draggingKeyRef.current = key;
    setDraggingKey(key);
    setDragY(0);
    hapticTap();
  }

  function dragHandleProps(key: string) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button != null && e.button !== 0) return;
        const pointerId = e.pointerId;
        const startY = e.clientY;
        const startX = e.clientX;
        cancelLongPress();
        let moved = false;
        function onMoveCheck(ev: PointerEvent) {
          if (Math.abs(ev.clientY - startY) > MOVE_CANCEL_PX || Math.abs(ev.clientX - startX) > MOVE_CANCEL_PX) {
            moved = true;
            cleanup();
          }
        }
        function onUpCheck() {
          cleanup();
        }
        function cleanup() {
          cancelLongPress();
          window.removeEventListener('pointermove', onMoveCheck);
          window.removeEventListener('pointerup', onUpCheck);
        }
        window.addEventListener('pointermove', onMoveCheck);
        window.addEventListener('pointerup', onUpCheck);
        longPressTimer.current = window.setTimeout(() => {
          cleanup();
          if (!moved) beginDrag(key, pointerId, startY);
        }, LONG_PRESS_MS);
      },
    };
  }

  useEffect(() => {
    if (!draggingKey) return;

    function onMove(e: PointerEvent) {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      setDragY(e.clientY - d.startClientY);

      const currentOrder = orderRef.current;
      const draggedIndex = currentOrder.indexOf(d.key);
      let targetIndex = draggedIndex;
      for (let i = 0; i < currentOrder.length; i++) {
        if (i === draggedIndex) continue;
        const el = nodeRefs.current.get(currentOrder[i]);
        if (!el) continue;
        const mid = el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;
        if (i < draggedIndex && e.clientY < mid) targetIndex = i;
        if (i > draggedIndex && e.clientY > mid) targetIndex = i;
      }
      if (targetIndex !== draggedIndex) {
        captureRects();
        setOrder((prev) => {
          const next = [...prev];
          const [moved] = next.splice(draggedIndex, 1);
          next.splice(targetIndex, 0, moved);
          return next;
        });
      }
    }

    function onUp(e: PointerEvent) {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      drag.current = null;
      draggingKeyRef.current = null;
      setDraggingKey(null);
      setDragY(0);
      justDraggedRef.current = true;
      onReorder(orderRef.current);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [draggingKey, onReorder]);

  const orderedItems = order.map((k) => items.find((i) => keyFor(i) === k)).filter((i): i is T => i != null);

  /** Wrap a click handler with this so a click synthesized right after a completed drag is swallowed. */
  function swallowDragClick(handler: () => void) {
    return () => {
      if (justDraggedRef.current) {
        justDraggedRef.current = false;
        return;
      }
      handler();
    };
  }

  return { orderedItems, registerNode, dragHandleProps, swallowDragClick, draggingKey, dragY };
}
