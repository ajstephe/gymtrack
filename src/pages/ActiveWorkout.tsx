import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, Trash2, Check, X, Flame, Plus, Scale, SlidersHorizontal } from 'lucide-react';
import { db, newId } from '../data/db';
import { useSessionStore } from '../store/sessionStore';
import { useRestTimerStore } from '../store/restTimerStore';
import { formatWeight, formatDuration, trimNum } from '../lib/format';
import { workingSets, suggestNextTarget } from '../lib/calculations';
import { UNIT_OPTIONS } from '../lib/unitOptions';
import { ExercisePhotoThumb, ExercisePhotoButton } from '../components/ExercisePhoto';
import { CategoryHeader } from '../components/CategoryHeader';
import { CategorySelect } from '../components/CategorySelect';
import { Collapse } from '../components/Collapse';
import { LogBodyWeightSheet } from '../components/LogBodyWeightSheet';
import type { Exercise, SetEntry, WeightUnit } from '../data/types';

const REST_PRESETS = [60, 90, 120, 180];
const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

interface Draft {
  weight: string;
  reps: string;
  rpe: string;
  warmup: boolean;
}

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
  const [newExForm, setNewExForm] = useState({ name: '', category: '', unit: 'kg' as WeightUnit, setupNote: '' });
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const categoriesInitialized = useRef(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  useEffect(() => {
    if (!session || session.endedAt) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  const categories = useMemo(() => {
    if (!exercises) return [];
    const order: string[] = [];
    const map = new Map<string, Exercise[]>();
    for (const ex of exercises) {
      if (!map.has(ex.category)) {
        map.set(ex.category, []);
        order.push(ex.category);
      }
      map.get(ex.category)!.push(ex);
    }
    return order.map((cat) => ({ category: cat, exercises: map.get(cat)! }));
  }, [exercises]);

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
  }

  async function deleteSet(setId: string) {
    await db.sets.delete(setId);
  }

  async function setUnit(exId: string, unit: 'kg' | 'lb') {
    await db.exercises.update(exId, { unit });
  }

  async function addExerciseOnTheFly() {
    if (!newExForm.name.trim() || !session) return;
    const count = await db.exercises.where('routineId').equals(session.routineId).count();
    const createdId = newId('ex');
    const createdCategory = newExForm.category.trim() || 'Other';
    await db.exercises.add({
      id: createdId,
      routineId: session.routineId,
      name: newExForm.name.trim(),
      category: createdCategory,
      unit: newExForm.unit,
      weightType: null,
      setupNote: newExForm.setupNote.trim() || undefined,
      order: count + 1,
      isCustom: true,
    });
    setNewExForm({ name: '', category: '', unit: 'kg', setupNote: '' });
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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            {routine?.name ?? '...'}
          </div>
          <h1 className="font-mono text-2xl font-bold tabular-nums">{formatDuration(elapsed)}</h1>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={finishWorkout}
            className="btn-glow-pink rounded-xl px-4 py-2.5 text-sm active:scale-[0.96]"
          >
            Finish
          </button>
          <button
            onClick={() => setShowBodyWeight(true)}
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-faint)] transition active:scale-95"
          >
            <Scale size={12} /> Log weight
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5 pb-24">
        {categories.map(({ category, exercises: exList }) => (
          <div key={category}>
            <CategoryHeader
              category={category}
              count={exList.length}
              collapsed={collapsedCategories.has(category)}
              onToggle={() => toggleCategory(category)}
            />
            <Collapse open={!collapsedCategories.has(category)}>
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
                  <div
                    key={ex.id}
                    id={`ex-${ex.id}`}
                    className="card-bevel overflow-hidden rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] transition-colors"
                  >
                    <button
                      onClick={() => setExpandedId(isOpen ? null : ex.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-[var(--color-surface-2)]"
                    >
                      <ExercisePhotoThumb exerciseId={ex.id} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{ex.name}</span>
                          {logged.length > 0 && (
                            <span className="shrink-0 rounded-full bg-[var(--color-lime)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text)]">
                              {logged.length} set{logged.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-[var(--color-text-faint)]">
                          {ex.setupNote && <span>{ex.setupNote} · </span>}
                          {lastTop ? (
                            <span>
                              Last: {formatWeight(lastTop.weight, ex.unit)} × {lastTop.reps}
                            </span>
                          ) : (
                            <span>No history yet</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`ml-2 shrink-0 text-[var(--color-text-faint)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <Collapse open={isOpen}>
                      <div
                        className={`border-t px-4 py-3.5 transition-colors ${
                          isOpen ? 'border-[var(--color-border)]' : 'border-transparent'
                        }`}
                      >
                        <div className="mb-3 flex items-center gap-2.5">
                          <ExercisePhotoButton exerciseId={ex.id} size={44} />
                          <span className="text-xs text-[var(--color-text-faint)]">
                            {ex.setupNote ?? 'Snap a photo so you remember this machine'}
                          </span>
                        </div>

                        {last && last.length > 0 && (
                          <div className="mb-3">
                            <div className="mb-1.5 text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                              Last time ·{' '}
                              {new Date(last[0].completedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(() => {
                                let workingIndex = 0;
                                return last.map((s) => {
                                  if (!s.isWarmup) workingIndex++;
                                  return (
                                    <span
                                      key={s.id}
                                      className="rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium tabular-nums"
                                    >
                                      {s.isWarmup ? (
                                        <span className="text-[var(--color-amber)]">W</span>
                                      ) : (
                                        workingIndex
                                      )}
                                      . {formatWeight(s.weight, s.unit)} × {s.reps}
                                      {s.rpe != null && (
                                        <span className="ml-1 font-normal text-[var(--color-text-faint)]">
                                          RPE {trimNum(s.rpe)}
                                        </span>
                                      )}
                                    </span>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}

                        {suggestion && (
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(ex.id, {
                                weight: String(suggestion.weight),
                                reps: String(suggestion.reps),
                              })
                            }
                            className="mb-3 flex w-full items-center justify-between rounded-xl bg-[var(--color-primary)]/12 px-3.5 py-2.5 text-left transition active:scale-[0.98]"
                          >
                            <span className="text-xs text-[var(--color-text-dim)]">{suggestion.reason}</span>
                            <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-xs font-semibold text-white">
                              {ex.unit === 'bodyweight' && suggestion.weight === 0
                                ? `${suggestion.reps} reps`
                                : `${formatWeight(suggestion.weight, ex.unit)} × ${suggestion.reps}`}
                            </span>
                          </button>
                        )}

                        {logged.length > 0 && (
                          <div className="mb-3 flex flex-col gap-1.5">
                            {(() => {
                              let workingIndex = 0;
                              return logged.map((s) => {
                                if (!s.isWarmup) workingIndex++;
                                return (
                                  <div
                                    key={s.id}
                                    className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-sm"
                                  >
                                    <span
                                      className={
                                        s.isWarmup
                                          ? 'font-medium text-[var(--color-amber)]'
                                          : 'text-[var(--color-text-faint)]'
                                      }
                                    >
                                      {s.isWarmup ? 'Warm-up' : `Set ${workingIndex}`}
                                    </span>
                                    <span className="font-medium tabular-nums">
                                      {formatWeight(s.weight, s.unit)} × {s.reps}
                                      {s.rpe != null && (
                                        <span className="ml-1.5 font-normal text-[var(--color-text-faint)]">
                                          RPE {trimNum(s.rpe)}
                                        </span>
                                      )}
                                    </span>
                                    <button
                                      onClick={() => deleteSet(s.id)}
                                      className="text-[var(--color-text-faint)] transition active:scale-90 active:text-[var(--color-danger)]"
                                      aria-label="Delete set"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}

                        <div className="mb-2.5 flex gap-2">
                          <label className="flex-1">
                            <span className="mb-1 flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                                {ex.unit === 'bodyweight' ? 'Weight (opt.)' : ex.unit === 'stack' ? 'Stack #' : 'Weight'}
                              </span>
                              {(ex.unit === 'kg' || ex.unit === 'lb') && (
                                <span className="flex overflow-hidden rounded-full border-2 border-[var(--color-border)]">
                                  {(['kg', 'lb'] as const).map((u) => (
                                    <button
                                      key={u}
                                      type="button"
                                      onClick={() => setUnit(ex.id, u)}
                                      className={`px-2 py-0.5 text-[10px] font-semibold transition active:scale-95 ${
                                        ex.unit === u
                                          ? 'bg-[var(--color-primary)] text-white'
                                          : 'bg-[var(--color-surface-2)] text-[var(--color-text-faint)]'
                                      }`}
                                    >
                                      {u}
                                    </button>
                                  ))}
                                </span>
                              )}
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={draft.weight}
                              onChange={(e) => updateDraft(ex.id, { weight: e.target.value })}
                              placeholder="0"
                              className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 font-mono text-xl font-bold outline-none"
                            />
                          </label>
                          <label className="flex-1">
                            <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                              Reps
                            </span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={draft.reps}
                              onChange={(e) => updateDraft(ex.id, { reps: e.target.value })}
                              placeholder="0"
                              className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 font-mono text-xl font-bold outline-none"
                            />
                          </label>
                        </div>

                        <div className="mb-2 flex items-center gap-2">
                          <button
                            onClick={() => updateDraft(ex.id, { warmup: !draft.warmup })}
                            className={`flex shrink-0 items-center gap-1 rounded-full border-2 border-[var(--color-border)] px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                              draft.warmup
                                ? 'bg-[var(--color-amber)] text-[var(--color-text)]'
                                : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'
                            }`}
                          >
                            <Flame size={12} /> Warm-up
                          </button>
                          <button
                            type="button"
                            onClick={() => setOptionsOpen((o) => !o)}
                            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-dim)] transition active:scale-95"
                          >
                            <SlidersHorizontal size={12} />
                            Options
                            {(draft.rpe !== '' || restDuration !== 90) && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                            )}
                            <ChevronDown
                              size={12}
                              className={`transition-transform ${optionsOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </div>

                        <Collapse open={optionsOpen}>
                          <div className="pb-3">
                            <div className="mb-3">
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                                  Intensity-o-meter{draft.rpe !== '' ? ` — RPE ${trimNum(parseFloat(draft.rpe))}` : ''}
                                </span>
                                {draft.rpe !== '' && (
                                  <button
                                    onClick={() => updateDraft(ex.id, { rpe: '' })}
                                    className="text-[10px] font-bold uppercase text-[var(--color-text-faint)] underline active:text-[var(--color-danger)]"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                              <div className="relative h-5 overflow-hidden rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)]">
                                <div
                                  className="absolute inset-y-0 left-0 transition-[width]"
                                  style={{
                                    width:
                                      draft.rpe !== ''
                                        ? `${((RPE_OPTIONS.indexOf(parseFloat(draft.rpe)) + 1) / RPE_OPTIONS.length) * 100}%`
                                        : '0%',
                                    background:
                                      'linear-gradient(90deg, var(--color-lime), var(--color-amber), var(--color-crimson))',
                                  }}
                                />
                                <div className="absolute inset-0 flex">
                                  {RPE_OPTIONS.map((r) => (
                                    <button
                                      key={r}
                                      onClick={() => updateDraft(ex.id, { rpe: String(r) })}
                                      aria-label={`RPE ${trimNum(r)}`}
                                      className="flex-1 border-r-2 border-[var(--color-border)]/50 last:border-r-0 active:scale-y-90"
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                                Rest
                              </span>
                              {REST_PRESETS.map((p) => (
                                <button
                                  key={p}
                                  onClick={() => setRestDuration(p)}
                                  className={`rounded-full border-2 border-[var(--color-border)] px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                                    restDuration === p
                                      ? 'bg-[var(--color-primary)] text-white'
                                      : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'
                                  }`}
                                >
                                  {p}s
                                </button>
                              ))}
                            </div>
                          </div>
                        </Collapse>

                        <button
                          onClick={() => logSet(ex)}
                          disabled={!draft.reps || (!draft.weight && ex.unit !== 'bodyweight')}
                          className="btn-glow-lime flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
                        >
                          <Check size={17} strokeWidth={3} /> Log Set
                        </button>
                      </div>
                    </Collapse>
                  </div>
                );
              })}
            </div>
            </Collapse>
          </div>
        ))}
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
        onClick={() => {
          setNewExForm((f) => ({ ...f, category: categories[0]?.category ?? '' }));
          setShowAddExercise(true);
        }}
        className="btn-glow-primary fixed right-4 bottom-[140px] z-30 flex h-12 w-12 items-center justify-center rounded-full text-white active:scale-90"
        aria-label="Add exercise to this workout"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {showAddExercise && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"
          onClick={() => setShowAddExercise(false)}
        >
          <div
            className="w-full max-w-[560px] rounded-t-3xl border-t-[3px] border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Add Exercise</h2>
              <button
                onClick={() => setShowAddExercise(false)}
                className="text-[var(--color-text-faint)] transition active:scale-90"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              <input
                autoFocus
                value={newExForm.name}
                onChange={(e) => setNewExForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Exercise name"
                className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
              />
              <CategorySelect
                categories={categories.map((c) => c.category)}
                value={newExForm.category}
                onChange={(category) => setNewExForm((f) => ({ ...f, category }))}
              />
              <input
                value={newExForm.setupNote}
                onChange={(e) => setNewExForm((f) => ({ ...f, setupNote: e.target.value }))}
                placeholder="Setup note (seat/pin, optional)"
                className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
              />
              <select
                value={newExForm.unit}
                onChange={(e) => setNewExForm((f) => ({ ...f, unit: e.target.value as WeightUnit }))}
                className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <button
                onClick={addExerciseOnTheFly}
                disabled={!newExForm.name.trim()}
                className="btn-glow-primary mt-1 rounded-lg py-2.5 text-sm transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
              >
                Add to Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {showBodyWeight && (
        <LogBodyWeightSheet
          sessionId={sessionId}
          defaultUnit={lastBodyWeight?.unit ?? 'kg'}
          onClose={() => setShowBodyWeight(false)}
        />
      )}
    </div>
  );
}
