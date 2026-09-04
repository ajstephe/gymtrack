import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Search, Plus, ChevronRight, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { db, newId } from '../data/db';
import type { Exercise, WeightUnit } from '../data/types';
import { EmptyState } from '../components/EmptyState';
import { ExercisePhotoThumb } from '../components/ExercisePhoto';
import { CategoryHeader } from '../components/CategoryHeader';
import { Collapse } from '../components/Collapse';
import { CategorySelect } from '../components/CategorySelect';
import { SwipeToDelete } from '../components/SwipeToDelete';
import { UNIT_OPTIONS } from '../lib/unitOptions';
import { useEscapeToClose } from '../lib/useEscapeToClose';
import { useCategoryOrdering } from '../lib/useCategoryOrdering';
import { useDragReorder } from '../lib/useDragReorder';

/**
 * One category's exercise rows, as its own component so it can own a single `useDragReorder`
 * instance scoped to just its own items — a hook can't be called a variable number of times
 * inside the parent's `.map()` over categories.
 */
function ExerciseGroupList({
  items,
  query,
  editOrder,
  onRemove,
  onMove,
  onReorder,
}: {
  items: Exercise[];
  query: string;
  editOrder: boolean;
  onRemove: (ex: Exercise) => void;
  onMove: (items: Exercise[], index: number, direction: -1 | 1) => void;
  onReorder: (items: Exercise[], orderedIds: string[]) => void;
}) {
  const handleReorder = useCallback((orderedIds: string[]) => onReorder(items, orderedIds), [items, onReorder]);
  const dragReorder = useDragReorder(items, (ex) => ex.id, handleReorder);
  const canReorder = editOrder && !query.trim() && items.length > 1;

  return (
    <div className="flex flex-col gap-1.5">
      {dragReorder.orderedItems.map((ex, i) => {
        const isDragging = dragReorder.draggingKey === ex.id;
        return (
          <div
            key={ex.id}
            ref={dragReorder.registerNode(ex.id)}
            style={
              isDragging
                ? { transform: `translateY(${dragReorder.dragY}px)`, position: 'relative', zIndex: 20 }
                : undefined
            }
          >
            <SwipeToDelete onDelete={() => onRemove(ex)} ariaLabel={`Remove ${ex.name}`}>
              <div
                onPointerDown={canReorder ? dragReorder.dragHandleProps(ex.id).onPointerDown : undefined}
                className={`card-bevel flex items-center rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] pr-1.5 transition active:scale-[0.99] ${
                  isDragging ? 'shadow-lg' : ''
                }`}
                style={isDragging ? { touchAction: 'none' } : undefined}
              >
                <Link
                  to={`/exercises/${ex.id}`}
                  onClick={(e) => {
                    if (dragReorder.justDraggedKeyRef.current === ex.id) {
                      e.preventDefault();
                      dragReorder.justDraggedKeyRef.current = null;
                    }
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5"
                >
                  <ExercisePhotoThumb exerciseId={ex.id} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{ex.name}</div>
                    {ex.setupNote && (
                      <div className="truncate text-xs text-[var(--color-text-faint)]">{ex.setupNote}</div>
                    )}
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-[var(--color-text-faint)]" />
                </Link>
                {canReorder && (
                  <div className="flex shrink-0 flex-col">
                    <button
                      onClick={() => onMove(items, i, -1)}
                      disabled={i === 0}
                      className="rounded p-1 text-[var(--color-text-faint)] transition active:scale-90 disabled:opacity-20"
                      aria-label={`Move ${ex.name} up`}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => onMove(items, i, 1)}
                      disabled={i === items.length - 1}
                      className="rounded p-1 text-[var(--color-text-faint)] transition active:scale-90 disabled:opacity-20"
                      aria-label={`Move ${ex.name} down`}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                )}
              </div>
            </SwipeToDelete>
          </div>
        );
      })}
    </div>
  );
}

export function ExerciseLibrary() {
  const routines = useLiveQuery(async () => (await db.routines.toArray()).filter((r) => !r.archived), []) ?? [];
  const [routineId, setRoutineId] = useState<string | null>(null);
  const activeRoutineId = routineId ?? routines[0]?.id ?? null;

  const exercises = useLiveQuery(async () => {
    if (!activeRoutineId) return [];
    const all = await db.exercises.where('routineId').equals(activeRoutineId).toArray();
    return all.filter((e) => !e.archived).sort((a, b) => a.order - b.order);
  }, [activeRoutineId]);

  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  useEscapeToClose(showAdd, () => setShowAdd(false));
  const [form, setForm] = useState({ name: '', category: '', unit: 'kg' as WeightUnit, setupNote: '' });
  const [editOrder, setEditOrder] = useState(false);

  const { categories: categoriesBase, dragReorder, moveCategory } = useCategoryOrdering(activeRoutineId, exercises);
  const allCategories = categoriesBase.map((c) => c.category);
  const categoryNamesKey = allCategories.join(' ');

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const categoriesInitialized = useRef<string | null>(null);

  useEffect(() => {
    if (categoriesInitialized.current !== activeRoutineId && allCategories.length > 0) {
      categoriesInitialized.current = activeRoutineId;
      setCollapsedCategories(new Set(allCategories));
    }
    // allCategories is intentionally not a dep — categoryNamesKey is its stable stand-in, since
    // the array itself is a fresh reference every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryNamesKey, activeRoutineId]);

  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  const grouped = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return categoriesBase.map((g) => ({ category: g.category, items: g.exercises }));
    return categoriesBase
      .map((g) => ({ category: g.category, items: g.exercises.filter((e) => e.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  })();

  async function addExercise() {
    if (!form.name.trim() || !activeRoutineId) return;
    const count = await db.exercises.where('routineId').equals(activeRoutineId).count();
    await db.exercises.add({
      id: newId('ex'),
      routineId: activeRoutineId,
      name: form.name.trim(),
      category: form.category.trim() || 'Other',
      unit: form.unit,
      weightType: null,
      setupNote: form.setupNote.trim() || undefined,
      order: count + 1,
      isCustom: true,
    });
    setForm({ name: '', category: '', unit: 'kg', setupNote: '' });
    setShowAdd(false);
  }

  async function removeExercise(ex: Exercise) {
    await db.exercises.update(ex.id, { archived: true });
  }

  async function moveExercise(items: Exercise[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const a = items[index];
    const b = items[targetIndex];
    await Promise.all([db.exercises.update(a.id, { order: b.order }), db.exercises.update(b.id, { order: a.order })]);
  }

  /**
   * Persists a full new order for one category's exercises. `order` is a single numbering shared
   * across the whole routine (not reset per category), so this permutes the category's *existing*
   * set of order values onto the dragged sequence rather than renumbering to 1..N — renumbering
   * would collide with other categories' exercises sitting in that same numeric space.
   */
  async function reorderExercises(items: Exercise[], orderedIds: string[]) {
    const slots = [...items].map((e) => e.order).sort((a, b) => a - b);
    await Promise.all(orderedIds.map((id, i) => db.exercises.update(id, { order: slots[i] })));
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Exercises</h1>

      <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-faint)]">
        Gym
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
        {routines.map((r) => (
          <button
            key={r.id}
            onClick={() => setRoutineId(r.id)}
            className={`shrink-0 rounded-full border-2 border-[var(--color-border)] px-3.5 py-1.5 text-sm font-medium transition active:scale-95 ${
              activeRoutineId === r.id
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-dim)]'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
        <Search size={16} className="text-[var(--color-text-faint)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-faint)]"
        />
      </div>

      {grouped.length > 1 && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => setEditOrder((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border-2 border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
              editOrder ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'
            }`}
          >
            <ArrowUpDown size={13} />
            {editOrder ? 'Done' : 'Edit order'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-5 pb-4">
        {grouped.length === 0 ? (
          <EmptyState title="No exercises found" />
        ) : (
          grouped.map(({ category, items }, i) => {
            const isCollapsed = !query.trim() && collapsedCategories.has(category);
            const isDragging = dragReorder.draggingKey === category;
            const canReorderCategories = editOrder && !query.trim() && grouped.length > 1;
            return (
            <div
              key={category}
              ref={dragReorder.registerNode(category)}
              style={
                isDragging
                  ? { transform: `translateY(${dragReorder.dragY}px)`, position: 'relative', zIndex: 20 }
                  : undefined
              }
            >
              <CategoryHeader
                category={category}
                count={items.length}
                collapsed={isCollapsed}
                onToggle={dragReorder.swallowDragClick(category, () => toggleCategory(category))}
                onDragPointerDown={canReorderCategories ? dragReorder.dragHandleProps(category).onPointerDown : undefined}
                dragging={isDragging}
                onMoveUp={canReorderCategories ? () => moveCategory(i, -1) : undefined}
                onMoveDown={canReorderCategories ? () => moveCategory(i, 1) : undefined}
                canMoveUp={i > 0}
                canMoveDown={i < grouped.length - 1}
              />
              <Collapse open={!isCollapsed}>
                <ExerciseGroupList
                  items={items}
                  query={query}
                  editOrder={editOrder}
                  onRemove={removeExercise}
                  onMove={moveExercise}
                  onReorder={reorderExercises}
                />
              </Collapse>
            </div>
            );
          })
        )}
      </div>

      {activeRoutineId && (
        <div className="pb-4">
          {showAdd ? (
            <div className="card-bevel flex flex-col gap-2.5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Exercise name"
                className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none"
              />
              <CategorySelect
                categories={allCategories}
                value={form.category}
                onChange={(category) => setForm((f) => ({ ...f, category }))}
              />
              <input
                value={form.setupNote}
                onChange={(e) => setForm((f) => ({ ...f, setupNote: e.target.value }))}
                placeholder="Setup note (seat/pin, optional)"
                className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none"
              />
              <select
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as WeightUnit }))}
                className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] py-2 text-sm font-medium transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={addExercise}
                  className="btn-glow-primary flex-1 rounded-lg py-2 text-sm transition active:scale-95"
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setForm((f) => ({ ...f, category: allCategories[0] ?? '' }));
                setShowAdd(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] px-4 py-3.5 text-sm text-[var(--color-text-dim)] transition active:scale-[0.98]"
            >
              <Plus size={16} /> Add exercise to this gym
            </button>
          )}
        </div>
      )}
    </div>
  );
}
