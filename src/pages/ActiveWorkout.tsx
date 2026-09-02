import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Plus, Scale, StickyNote, Search } from 'lucide-react';
import { db, newId } from '../data/db';
import { useSessionStore } from '../store/sessionStore';
import { useRestTimerStore } from '../store/restTimerStore';
import { formatWeight, formatDuration, trimNum } from '../lib/format';
import { workingSets, suggestNextTarget, personalRecords, WEIGHT_INCREMENT } from '../lib/calculations';
import { useEscapeToClose } from '../lib/useEscapeToClose';
import { useCategoryOrdering } from '../lib/useCategoryOrdering';
import { hapticTap, hapticSuccess } from '../lib/haptics';
import { showToast } from '../store/toastStore';
import { CategoryHeader } from '../components/CategoryHeader';
import { Collapse } from '../components/Collapse';
import { LogBodyWeightSheet } from '../components/LogBodyWeightSheet';
import { WorkoutNotesSheet } from '../components/WorkoutNotesSheet';
import { AddExerciseSheet, type NewExerciseForm } from '../components/AddExerciseSheet';
import { ExerciseCard, type Draft } from '../components/ExerciseCard';
import type { Exercise, SetEntry } from '../data/types';

export function ActiveWorkout() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const setActiveSessionId = useSessionStore((s) => s.setActiveSessionId);
  const startTimer = useRestTimerStore((s) => s.start);

  const session = useLiveQuery(() => (sessionId ? db.sessions.get(sessionId) : undefined), [sessionId]);
  const routine = useLiveQuery(
    () => (session ? db.routines.get(session.routineId) : undefined),
    [session?.routineId]
  );
  const exercises = useLiveQuery(async () => {
    if (!session) return [] as Exercise[];
    const all = await db.exercises.where('routineId').equals(session.routineId).toArray();
    return all.filter((e) => !e.archived).sort((a, b) => a.order - b.order);
  }, [session?.routineId]);
  const sessionSets = useLiveQuery(
    () => (sessionId ? db.sets.where('sessionId').equals(sessionId).toArray() : []),
    [sessionId]
  );
  const allSets = useLiveQuery(() => db.sets.toArray(), []);
  const lastBodyWeight = useLiveQuery(() => db.bodyWeights.orderBy('date').last(), []);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [restDuration, setRestDuration] = useState(90);
  const [showBodyWeight, setShowBodyWeight] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const categoriesInitialized = useRef(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ weight: '', reps: '', rpe: '' });
  const [showNotes, setShowNotes] = useState(false);
  const [exerciseQuery, setExerciseQuery] = useState('');

  useEscapeToClose(showAddExercise, () => setShowAddExercise(false));
  useEscapeToClose(showNotes, () => setShowNotes(false));

  useEffect(() => {
    if (!session || session.endedAt) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  const { categories, dragReorder, moveCategory } = useCategoryOrdering(session?.routineId, exercises);

  const visibleCategories = useMemo(() => {
    const q = exerciseQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((c) => ({ category: c.category, exercises: c.exercises.filter((e) => e.name.toLowerCase().includes(q)) }))
      .filter((c) => c.exercises.length > 0);
  }, [categories, exerciseQuery]);

  useEffect(() => {
    if (!categoriesInitialized.current && categories.length > 0) {
      categoriesInitialized.current = true;
      setCollapsedCategories(new Set(categories.map((c) => c.category)));
    }
  }, [categories]);

  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  const personalBests = useMemo(() => personalRecords(workingSets(allSets ?? [])), [allSets]);

  const setsByExercise = useMemo(() => {
    const map = new Map<string, SetEntry[]>();
    for (const s of sessionSets ?? []) {
      const arr = map.get(s.exerciseId) ?? [];
      arr.push(s);
      map.set(s.exerciseId, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.setNumber - b.setNumber);
    return map;
  }, [sessionSets]);

  function lastTimeSets(exerciseId: string): SetEntry[] | null {
    if (!allSets || !sessionId) return null;
    const prior = allSets.filter((s) => s.exerciseId === exerciseId && s.sessionId !== sessionId);
    if (prior.length === 0) return null;
    const latestSessionId = prior.reduce((latest, s) =>
      s.completedAt > latest.completedAt ? s : latest
    ).sessionId;
    return prior.filter((s) => s.sessionId === latestSessionId).sort((a, b) => a.setNumber - b.setNumber);
  }

  function defaultDraft(exId: string): Draft {
    const logged = setsByExercise.get(exId);
    const last = logged && logged.length > 0 ? logged[logged.length - 1] : lastTimeSets(exId)?.slice(-1)[0];
    return { weight: last ? String(last.weight) : '', reps: last ? String(last.reps) : '', rpe: '', warmup: false };
  }

  function draftFor(ex: Exercise): Draft {
    return drafts[ex.id] ?? defaultDraft(ex.id);
  }

  function updateDraft(exId: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [exId]: { ...(d[exId] ?? defaultDraft(exId)), ...patch } }));
  }

  async function logSet(ex: Exercise) {
    const draft = draftFor(ex);
    const weight = draft.weight ? parseFloat(draft.weight) : ex.unit === 'bodyweight' ? 0 : NaN;
    const reps = parseInt(draft.reps, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps) || !sessionId) return;
    const existing = setsByExercise.get(ex.id) ?? [];

    let isPR = false;
    if (!draft.warmup) {
      const priorBest = personalRecords(workingSets(allSets ?? [])).get(ex.id);
      isPR = !priorBest || weight > priorBest.weight;
    }

    await db.sets.add({
      id: newId('set'),
      sessionId,
      exerciseId: ex.id,
      setNumber: existing.length + 1,
      weight,
      reps,
      unit: ex.unit,
      isWarmup: draft.warmup || undefined,
      rpe: draft.rpe ? parseFloat(draft.rpe) : undefined,
      completedAt: new Date().toISOString(),
    });
    setDrafts((d) => {
      const next = { ...d };
      delete next[ex.id];
      return next;
    });
    startTimer(restDuration, ex.name);

    if (isPR && weight > 0) {
      hapticSuccess();
      showToast(`New PR — ${formatWeight(weight, ex.unit)} × ${reps} on ${ex.name}`, 'success');
    } else {
      hapticTap();
    }
  }

  async function deleteSet(setId: string) {
    await db.sets.delete(setId);
    if (editingSetId === setId) setEditingSetId(null);
  }

  function startEditSet(s: SetEntry) {
    setEditingSetId(s.id);
    setEditDraft({ weight: String(s.weight), reps: String(s.reps), rpe: s.rpe != null ? String(s.rpe) : '' });
  }

  async function saveEditSet(s: SetEntry) {
    const weight = editDraft.weight ? parseFloat(editDraft.weight) : s.unit === 'bodyweight' ? 0 : NaN;
    const reps = parseInt(editDraft.reps, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) return;
    await db.sets.update(s.id, { weight, reps, rpe: editDraft.rpe ? parseFloat(editDraft.rpe) : undefined });
    setEditingSetId(null);
    hapticTap();
  }

  async function quickRepeatSet(ex: Exercise) {
    if (!sessionId) return;
    const logged = setsByExercise.get(ex.id) ?? [];
    const last = logged[logged.length - 1];
    if (!last) return;
    await db.sets.add({
      id: newId('set'),
      sessionId,
      exerciseId: ex.id,
      setNumber: logged.length + 1,
      weight: last.weight,
      reps: last.reps,
      unit: last.unit,
      isWarmup: last.isWarmup,
      rpe: last.rpe,
      completedAt: new Date().toISOString(),
    });
    startTimer(restDuration, ex.name);
    hapticTap();
  }

  function bumpWeight(ex: Exercise, delta: 1 | -1) {
    const draft = draftFor(ex);
    const current = draft.weight ? parseFloat(draft.weight) : 0;
    const inc = WEIGHT_INCREMENT[ex.unit];
    const next = Math.max(0, Math.round((current + delta * inc) * 100) / 100);
    updateDraft(ex.id, { weight: trimNum(next) });
  }

  function bumpReps(ex: Exercise, delta: 1 | -1) {
    const draft = draftFor(ex);
    const current = draft.reps ? parseInt(draft.reps, 10) : 0;
    const next = Math.max(0, current + delta);
    updateDraft(ex.id, { reps: String(next) });
  }

  async function setUnit(exId: string, unit: 'kg' | 'lb' | 'stack') {
    await db.exercises.update(exId, { unit });
  }

  async function updateSetupNote(exId: string, note: string) {
    await db.exercises.update(exId, { setupNote: note || undefined });
  }

  async function addExerciseOnTheFly(form: NewExerciseForm) {
    if (!form.name.trim() || !session) return;
    const count = await db.exercises.where('routineId').equals(session.routineId).count();
    const createdId = newId('ex');
    const createdCategory = form.category.trim() || 'Other';
    await db.exercises.add({
      id: createdId,
      routineId: session.routineId,
      name: form.name.trim(),
      category: createdCategory,
      unit: form.unit,
      weightType: null,
      setupNote: form.setupNote.trim() || undefined,
      order: count + 1,
      isCustom: true,
    });
    setShowAddExercise(false);
    setExpandedId(createdId);
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.delete(createdCategory);
      return next;
    });
    setTimeout(() => {
      document.getElementById(`ex-${createdId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  async function finishWorkout() {
    if (!sessionId) return;
    await db.sessions.update(sessionId, { endedAt: new Date().toISOString() });
    setActiveSessionId(null);
    navigate(`/history/${sessionId}`);
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 pt-16 text-center">
        <p className="text-[var(--color-text-dim)]">Workout not found.</p>
        <button onClick={() => navigate('/train')} className="text-[var(--color-primary)]">
          Back to Train
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            {routine?.name ?? '...'}
          </div>
          <h1 className="font-mono text-2xl font-bold tabular-nums">{formatDuration(elapsed)}</h1>
          {/* Deliberately far from Finish (top-right) — these get tapped constantly mid-workout,
              and sitting right under a workout-ending button invited fat-finger accidents. */}
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => setShowBodyWeight(true)}
              className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-faint)] transition active:scale-95"
            >
              <Scale size={12} /> Log body weight
            </button>
            <button
              onClick={() => setShowNotes(true)}
              className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-faint)] transition active:scale-95"
            >
              <StickyNote size={12} /> {session.notes ? 'Notes' : 'Add note'}
              {session.notes && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />}
            </button>
          </div>
        </div>
        <button
          onClick={finishWorkout}
          className="btn-glow-pink shrink-0 rounded-xl px-4 py-2.5 text-sm active:scale-[0.96]"
        >
          Finish
        </button>
      </div>

      {exercises && exercises.length > 6 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
          <Search size={16} className="text-[var(--color-text-faint)]" />
          <input
            value={exerciseQuery}
            onChange={(e) => setExerciseQuery(e.target.value)}
            placeholder="Find an exercise"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-faint)]"
          />
          {exerciseQuery && (
            <button onClick={() => setExerciseQuery('')} className="text-[var(--color-text-faint)]" aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-5 pb-24">
        {visibleCategories.map(({ category, exercises: exList }, i) => {
          const isCollapsed = !exerciseQuery.trim() && collapsedCategories.has(category);
          const isDragging = dragReorder.draggingKey === category;
          const canReorderCategories = !exerciseQuery.trim() && visibleCategories.length > 1;
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
              count={exList.length}
              collapsed={isCollapsed}
              onToggle={dragReorder.swallowDragClick(category, () => toggleCategory(category))}
              onDragPointerDown={canReorderCategories ? dragReorder.dragHandleProps(category).onPointerDown : undefined}
              dragging={isDragging}
              onMoveUp={canReorderCategories ? () => moveCategory(i, -1) : undefined}
              onMoveDown={canReorderCategories ? () => moveCategory(i, 1) : undefined}
              canMoveUp={i > 0}
              canMoveDown={i < visibleCategories.length - 1}
            />
            <Collapse open={!isCollapsed}>
              <div className="flex flex-col gap-2">
                {exList.map((ex) => {
                  const logged = setsByExercise.get(ex.id) ?? [];
                  const workingLogged = logged.filter((s) => !s.isWarmup);
                  const isOpen = expandedId === ex.id;
                  const last = lastTimeSets(ex.id);
                  const lastWorking = last ? workingSets(last) : [];
                  const lastTop =
                    lastWorking.length > 0 ? [...lastWorking].sort((a, b) => b.weight - a.weight)[0] : null;
                  const suggestion = lastTop && workingLogged.length === 0 ? suggestNextTarget(lastTop) : null;
                  const draft = draftFor(ex);

                  return (
                    <ExerciseCard
                      key={ex.id}
                      ex={ex}
                      isOpen={isOpen}
                      onToggleOpen={() => setExpandedId(isOpen ? null : ex.id)}
                      logged={logged}
                      last={last}
                      lastTop={lastTop}
                      suggestion={suggestion}
                      personalBest={personalBests.get(ex.id) ?? null}
                      draft={draft}
                      onUpdateDraft={(patch) => updateDraft(ex.id, patch)}
                      onLogSet={() => logSet(ex)}
                      onQuickRepeat={() => quickRepeatSet(ex)}
                      onSetUnit={(unit) => setUnit(ex.id, unit)}
                      onBumpWeight={(delta) => bumpWeight(ex, delta)}
                      onBumpReps={(delta) => bumpReps(ex, delta)}
                      onUpdateSetupNote={(note) => updateSetupNote(ex.id, note)}
                      editingSetId={editingSetId}
                      editDraft={editDraft}
                      onEditDraftChange={(patch) => setEditDraft((d) => ({ ...d, ...patch }))}
                      onStartEditSet={startEditSet}
                      onSaveEditSet={saveEditSet}
                      onCancelEditSet={() => setEditingSetId(null)}
                      onDeleteSet={deleteSet}
                      restDuration={restDuration}
                      onSetRestDuration={setRestDuration}
                    />
                  );
                })}
              </div>
            </Collapse>
          </div>
          );
        })}
      </div>

      {expandedId && (
        <button
          onClick={() => setExpandedId(null)}
          className="fixed right-4 bottom-[200px] z-30 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-2)] shadow-lg transition active:scale-90"
          aria-label="Collapse"
        >
          <X size={18} />
        </button>
      )}

      <button
        onClick={() => setShowAddExercise(true)}
        className="btn-glow-primary fixed right-4 bottom-[140px] z-30 flex h-12 w-12 items-center justify-center rounded-full text-white active:scale-90"
        aria-label="Add exercise to this workout"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {showAddExercise && (
        <AddExerciseSheet
          defaultCategory={categories[0]?.category ?? ''}
          categories={categories.map((c) => c.category)}
          onAdd={addExerciseOnTheFly}
          onClose={() => setShowAddExercise(false)}
        />
      )}

      {showBodyWeight && (
        <LogBodyWeightSheet
          sessionId={sessionId}
          defaultUnit={lastBodyWeight?.unit ?? 'kg'}
          onClose={() => setShowBodyWeight(false)}
        />
      )}

      {showNotes && (
        <WorkoutNotesSheet sessionId={session.id} initialNotes={session.notes ?? ''} onClose={() => setShowNotes(false)} />
      )}
    </div>
  );
}
