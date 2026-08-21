import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, Trash2, Check, X } from 'lucide-react';
import { db, newId } from '../data/db';
import { useSessionStore } from '../store/sessionStore';
import { useRestTimerStore } from '../store/restTimerStore';
import { formatWeight, formatDuration } from '../lib/format';
import { ExercisePhotoThumb, ExercisePhotoButton } from '../components/ExercisePhoto';
import type { Exercise, SetEntry } from '../data/types';

const REST_PRESETS = [60, 90, 120, 180];

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

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [restDuration, setRestDuration] = useState(90);
  const [drafts, setDrafts] = useState<Record<string, { weight: string; reps: string }>>({});

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

  function defaultDraft(exId: string): { weight: string; reps: string } {
    const logged = setsByExercise.get(exId);
    const last = logged && logged.length > 0 ? logged[logged.length - 1] : lastTimeSets(exId)?.slice(-1)[0];
    return { weight: last ? String(last.weight) : '', reps: last ? String(last.reps) : '' };
  }

  function draftFor(ex: Exercise): { weight: string; reps: string } {
    return drafts[ex.id] ?? defaultDraft(ex.id);
  }

  function updateDraft(exId: string, patch: Partial<{ weight: string; reps: string }>) {
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
      completedAt: new Date().toISOString(),
    });
    startTimer(restDuration, ex.name);
  }

  async function deleteSet(setId: string) {
    await db.sets.delete(setId);
  }

  async function setUnit(exId: string, unit: 'kg' | 'lb') {
    await db.exercises.update(exId, { unit });
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
        <button
          onClick={finishWorkout}
          className="rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-2)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Finish
        </button>
      </div>

      <div className="flex flex-col gap-5 pb-24">
        {categories.map(({ category, exercises: exList }) => (
          <div key={category}>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">
              {category}
            </h2>
            <div className="flex flex-col gap-2">
              {exList.map((ex) => {
                const logged = setsByExercise.get(ex.id) ?? [];
                const isOpen = expandedId === ex.id;
                const last = lastTimeSets(ex.id);
                const lastTop = last ? [...last].sort((a, b) => b.weight - a.weight)[0] : null;
                const draft = draftFor(ex);

                return (
                  <div
                    key={ex.id}
                    className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                  >
                    <button
                      onClick={() => setExpandedId(isOpen ? null : ex.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <ExercisePhotoThumb exerciseId={ex.id} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{ex.name}</span>
                          {logged.length > 0 && (
                            <span className="shrink-0 rounded-full bg-[var(--color-lime)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-lime)]">
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

                    {isOpen && (
                      <div className="border-t border-[var(--color-border)] px-4 py-3.5">
                        <div className="mb-3 flex items-center gap-2.5">
                          <ExercisePhotoButton exerciseId={ex.id} size={44} />
                          <span className="text-xs text-[var(--color-text-faint)]">
                            {ex.setupNote ?? 'Snap a photo so you remember this machine'}
                          </span>
                        </div>

                        {logged.length > 0 && (
                          <div className="mb-3 flex flex-col gap-1.5">
                            {logged.map((s, i) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-sm"
                              >
                                <span className="text-[var(--color-text-faint)]">Set {i + 1}</span>
                                <span className="font-medium tabular-nums">
                                  {formatWeight(s.weight, s.unit)} × {s.reps}
                                </span>
                                <button
                                  onClick={() => deleteSet(s.id)}
                                  className="text-[var(--color-text-faint)] active:text-[var(--color-danger)]"
                                  aria-label="Delete set"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mb-2.5 flex gap-2">
                          <label className="flex-1">
                            <span className="mb-1 flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                                {ex.unit === 'bodyweight' ? 'Weight (opt.)' : ex.unit === 'stack' ? 'Stack #' : 'Weight'}
                              </span>
                              {(ex.unit === 'kg' || ex.unit === 'lb') && (
                                <span className="flex overflow-hidden rounded-full">
                                  {(['kg', 'lb'] as const).map((u) => (
                                    <button
                                      key={u}
                                      type="button"
                                      onClick={() => setUnit(ex.id, u)}
                                      className={`px-2 py-0.5 text-[10px] font-semibold ${
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
                              className="w-full rounded-xl bg-[var(--color-surface-2)] px-3 py-2.5 text-lg font-semibold outline-none"
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
                              className="w-full rounded-xl bg-[var(--color-surface-2)] px-3 py-2.5 text-lg font-semibold outline-none"
                            />
                          </label>
                        </div>

                        <div className="mb-3 flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">Rest</span>
                          {REST_PRESETS.map((p) => (
                            <button
                              key={p}
                              onClick={() => setRestDuration(p)}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                restDuration === p
                                  ? 'bg-[var(--color-primary)] text-white'
                                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'
                              }`}
                            >
                              {p}s
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => logSet(ex)}
                          disabled={!draft.reps || (!draft.weight && ex.unit !== 'bodyweight')}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--color-lime)] py-2.5 font-semibold text-[#0a0a0f] active:scale-[0.98] disabled:opacity-40"
                        >
                          <Check size={17} strokeWidth={3} /> Log Set
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {expandedId && (
        <button
          onClick={() => setExpandedId(null)}
          className="fixed right-4 bottom-[140px] z-30 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-2)] shadow-lg"
          aria-label="Collapse"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
