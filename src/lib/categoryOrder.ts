import { db } from '../data/db';

/**
 * Applies a saved category display order to a naturally-derived list (categories in the order
 * their exercises first appear). Any category not yet in the saved order — new, or the very
 * first time — is appended at the end in its natural position, and any saved entry that no
 * longer corresponds to a real category (renamed/removed) is silently dropped.
 */
export function applyCategoryOrder(naturalOrder: string[], saved: string[] | undefined): string[] {
  if (!saved || saved.length === 0) return naturalOrder;
  const kept = saved.filter((c) => naturalOrder.includes(c));
  const added = naturalOrder.filter((c) => !kept.includes(c));
  return [...kept, ...added];
}

export async function saveCategoryOrder(routineId: string, order: string[]) {
  await db.categoryOrders.put({ routineId, order });
}
