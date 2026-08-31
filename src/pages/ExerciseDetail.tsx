import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Pencil, X, Trophy, TrendingUp, ListOrdered, CalendarClock } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { db } from '../data/db';
import type { WeightType, WeightUnit } from '../data/types';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { ExercisePhotoCard } from '../components/ExercisePhoto';
import { CategorySelect } from '../components/CategorySelect';
import { Spinner } from '../components/Spinner';
import { estOneRepMax, topSetOf, workingSets } from '../lib/calculations';
import { formatWeight, weightTypeLabel, trimNum } from '../lib/format';
import { UNIT_OPTIONS } from '../lib/unitOptions';

const WEIGHT_TYPE_OPTIONS: { value: WeightType; label: string }[] = [
  { value: null, label: 'Not specified' },
  { value: 'each', label: weightTypeLabel.each },
  { value: 'total', label: weightTypeLabel.total },
  { value: 'bar', label: weightTypeLabel.bar },
  { value: 'each_bar', label: weightTypeLabel.each_bar },
];

export function ExerciseDetail() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const exercise = useLiveQuery(() => (exerciseId ? db.exercises.get(exerciseId) : undefined), [exerciseId]);
  const sets = useLiveQuery(
    () => (exerciseId ? db.sets.where('exerciseId').equals(exerciseId).toArray() : []),
    [exerciseId]
  );
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const siblingExercises = useLiveQuery(
    () => (exercise ? db.exercises.where('routineId').equals(exercise.routineId).toArray() : []),
    [exercise?.routineId]
  ) ?? [];

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    setupNote: '',
    unit: 'kg' as WeightUnit,
    weightType: null as WeightType,
  });

  const working = useMemo(() => (sets ? workingSets(sets) : []), [sets]);

  const bySession = useMemo(() => {
    if (!sets) return [];
    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const allBySession = new Map<string, typeof sets>();
    const workingBySession = new Map<string, typeof sets>();
    for (const s of sets) {
      const arr = allBySession.get(s.sessionId) ?? [];
      arr.push(s);
      allBySession.set(s.sessionId, arr);
      if (!s.isWarmup) {
        const warr = workingBySession.get(s.sessionId) ?? [];
        warr.push(s);
        workingBySession.set(s.sessionId, warr);
      }
    }
    return [...allBySession.entries()]
      .filter(([sessionId]) => workingBySession.has(sessionId))
      .map(([sessionId, s]) => ({
        sessionId,
        date: sessionById.get(sessionId)?.startedAt ?? s[0].completedAt,
        top: topSetOf(workingBySession.get(sessionId)!)!,
        sets: [...s].sort((a, b) => a.setNumber - b.setNumber),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sets, sessions]);

  const chartData = bySession.map((row) => ({
    date: new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    weight: row.top.weight,
  }));

  const allTimeBest = working.length > 0 ? topSetOf(working) : null;
  const bestE1rm = working.length > 0 ? Math.max(...working.map((s) => estOneRepMax(s.weight, s.reps))) : null;
  const lastSession = bySession[bySession.length - 1];

  const siblingCategories = useMemo(() => {
    const seen: string[] = [];
    for (const e of siblingExercises) if (!seen.includes(e.category)) seen.push(e.category);
    return seen;
  }, [siblingExercises]);

  function openEdit() {
    if (!exercise) return;
    setEditForm({
      name: exercise.name,
      category: exercise.category,
      setupNote: exercise.setupNote ?? '',
      unit: exercise.unit,
      weightType: exercise.weightType,
    });
    setShowEdit(true);
  }

  async function saveEdit() {
    if (!exercise || !editForm.name.trim()) return;
    await db.exercises.update(exercise.id, {
      name: editForm.name.trim(),
      category: editForm.category.trim() || 'Other',
      setupNote: editForm.setupNote.trim() || undefined,
      unit: editForm.unit,
      weightType: editForm.weightType,
    });
    setShowEdit(false);
  }

  if (!exercise) {
    return <Spinner />;
  }

  return (
    <div className="px-4 pt-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="-m-2 flex items-center gap-1 p-2 text-[var(--color-text-dim)] transition active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={openEdit}
          className="-m-2 flex items-center gap-1 p-2 text-[var(--color-text-dim)] transition active:scale-90"
          aria-label="Edit exercise"
        >
          <Pencil size={17} />
        </button>
      </div>

      <h1 className="text-2xl font-bold">{exercise.name}</h1>
      <div className="mb-1 mt-1 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-text-dim)]">
          {exercise.category}
        </span>
        {exercise.weightType && (
          <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-text-dim)]">
            {weightTypeLabel[exercise.weightType]}
          </span>
        )}
      </div>
      {exercise.setupNote && <p className="mb-3 text-sm text-[var(--color-text-faint)]">{exercise.setupNote}</p>}

      <ExercisePhotoCard exerciseId={exercise.id} />

      {!sets || sets.length === 0 ? (
        <EmptyState title="No sets logged yet" sub="Log this exercise in a workout to start tracking progress." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <StatCard
              label="Personal record"
              value={allTimeBest ? formatWeight(allTimeBest.weight, exercise.unit) : '–'}
              sub={allTimeBest ? `× ${allTimeBest.reps} reps` : undefined}
              icon={<Trophy size={16} />}
              accent="var(--color-amber)"
            />
            <StatCard
              label="Est. 1RM"
              value={bestE1rm ? formatWeight(Math.round(bestE1rm), exercise.unit) : '–'}
              icon={<TrendingUp size={16} />}
              accent="var(--color-lime)"
            />
            <StatCard
              label="Sets logged"
              value={`${sets.length}`}
              icon={<ListOrdered size={16} />}
              accent="var(--color-azure)"
            />
            <StatCard
              label="Last trained"
              value={
                lastSession
                  ? new Date(lastSession.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : '–'
              }
              icon={<CalendarClock size={16} />}
              accent="var(--color-crimson)"
            />
          </div>

          {chartData.length > 1 && (
            <div className="mb-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h2 className="mb-2 text-sm font-semibold text-[var(--color-text-dim)]">Top Set Weight</h2>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [formatWeight(Number(v), exercise.unit), 'Top set']}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--color-primary)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">
            History
          </h2>
          <div className="flex flex-col gap-2 pb-6">
            {[...bySession].reverse().map((row) => (
              <div key={row.sessionId} className="rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
                <div className="mb-2 text-xs text-[var(--color-text-faint)]">
                  {new Date(row.date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {row.sets.map((s, i) => (
                    <span
                      key={s.id}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium tabular-nums ${
                        s.isWarmup
                          ? 'bg-[var(--color-amber)]/10 text-[var(--color-amber)]'
                          : 'bg-[var(--color-surface-2)]'
                      }`}
                    >
                      {s.isWarmup ? 'W' : i + 1}. {formatWeight(s.weight, s.unit)} × {s.reps}
                      {s.rpe != null && (
                        <span className="ml-1 font-normal text-[var(--color-text-faint)]">RPE {trimNum(s.rpe)}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowEdit(false)}>
          <div
            className="w-full max-w-[560px] rounded-t-3xl border-t-[3px] border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Edit Exercise</h2>
              <button
                onClick={() => setShowEdit(false)}
                className="text-[var(--color-text-faint)] transition active:scale-90"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              <input
                autoFocus
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Exercise name"
                className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
              />
              <CategorySelect
                categories={siblingCategories}
                value={editForm.category}
                onChange={(category) => setEditForm((f) => ({ ...f, category }))}
              />
              <input
                value={editForm.setupNote}
                onChange={(e) => setEditForm((f) => ({ ...f, setupNote: e.target.value }))}
                placeholder="Setup note (seat/pin, optional)"
                className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
              />
              <select
                value={editForm.unit}
                onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value as WeightUnit }))}
                className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <select
                value={editForm.weightType ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, weightType: (e.target.value || null) as WeightType }))}
                className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
              >
                {WEIGHT_TYPE_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value ?? ''}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                onClick={saveEdit}
                disabled={!editForm.name.trim()}
                className="btn-glow-primary mt-1 rounded-lg py-2.5 text-sm transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
