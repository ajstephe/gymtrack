import { useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { Exercise } from '../data/types';
import { applyCategoryOrder, saveCategoryOrder } from './categoryOrder';
import { useDragReorder } from './useDragReorder';

/**
 * Groups a routine's exercises by category in the user's saved display order (falling back to
 * natural first-appearance order until they've reordered anything), with drag-reorder wiring
 * attached. Shared by the Exercises tab and an active workout so a reorder made in one shows up
 * in the other — both were independently re-deriving this exact same thing.
 */
export function useCategoryOrdering(routineId: string | null | undefined, exercises: Exercise[] | undefined) {
  const naturalCategoryNames = useMemo(() => {
    if (!exercises) return [];
    const seen: string[] = [];
    for (const ex of exercises) if (!seen.includes(ex.category)) seen.push(ex.category);
    return seen;
  }, [exercises]);

  const categoryOrderRow = useLiveQuery(
    () => (routineId ? db.categoryOrders.get(routineId) : undefined),
    [routineId]
  );
  const orderedCategoryNames = useMemo(
    () => applyCategoryOrder(naturalCategoryNames, categoryOrderRow?.order),
    [naturalCategoryNames, categoryOrderRow]
  );

  const categoriesBase = useMemo(() => {
    if (!exercises) return [];
    const map = new Map<string, Exercise[]>();
    for (const ex of exercises) {
      if (!map.has(ex.category)) map.set(ex.category, []);
      map.get(ex.category)!.push(ex);
    }
    return orderedCategoryNames.map((cat) => ({ category: cat, exercises: map.get(cat) ?? [] }));
  }, [exercises, orderedCategoryNames]);

  const persistOrder = useCallback(
    (keys: string[]) => {
      if (routineId) saveCategoryOrder(routineId, keys);
    },
    [routineId]
  );

  const dragReorder = useDragReorder(categoriesBase, (c) => c.category, persistOrder);

  /** Non-gesture fallback, mirroring the up/down buttons exercises already have. */
  const moveCategory = useCallback(
    (index: number, direction: -1 | 1) => {
      const current = dragReorder.orderedItems.map((c) => c.category);
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      persistOrder(next);
    },
    [dragReorder.orderedItems, persistOrder]
  );

  return { categories: dragReorder.orderedItems, dragReorder, moveCategory };
}
