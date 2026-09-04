import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Flame, TrendingUp, CalendarCheck, Trophy, ChevronRight, Play, Plus, Pencil, Scale, Settings as SettingsIcon } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { db } from '../data/db';
import { useSessionStore } from '../store/sessionStore';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { LogBodyWeightSheet } from '../components/LogBodyWeightSheet';
import {
  currentStreak,
  weeklyVolumeSeries,
  weeklyVolumeByCategory,
  recentPRs,
  workingSets,
  sessionBests,
} from '../lib/calculations';
import { formatVolume, formatWeight, trimNum } from '../lib/format';
import { categoryColorInSet } from '../lib/categoryColors';
import { startOfMonth } from 'date-fns';
import type { BodyWeightEntry } from '../data/types';

interface VolumeTooltipEntry {
  dataKey: string;
  value: number;
  color: string;
}

function VolumeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: VolumeTooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entries = payload.filter((p) => p.value > 0);
  const total = entries.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-2 text-xs">
      <div className="mb-1 font-bold">{label}</div>
      {entries.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
          <span>
            {p.dataKey}: {p.value.toLocaleString()} kg
          </span>
        </div>
      ))}
      <div className="mt-1 font-bold">Total: {total.toLocaleString()} kg</div>
    </div>
  );
}

export function Dashboard() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const sets = useLiveQuery(() => db.sets.toArray(), []) ?? [];
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];
  const bodyWeights = useLiveQuery(() => db.bodyWeights.toArray(), []) ?? [];
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const [bwSheet, setBwSheet] = useState<'add' | BodyWeightEntry | null>(null);
  const [trackedCategory, setTrackedCategory] = useState<string | null>(null);
  const [trackedExerciseId, setTrackedExerciseId] = useState<string | null>(null);

  const finishedSessions = sessions.filter((s) => s.endedAt);
  const activeSession = sessions.find((s) => s.id === activeSessionId && !s.endedAt);

  const working = workingSets(sets);
  const streak = currentStreak(finishedSessions);
  const weekly = weeklyVolumeSeries(working, 8);
  const thisWeek = weekly[weekly.length - 1]?.volume ?? 0;
  const lastWeek = weekly[weekly.length - 2]?.volume ?? 0;
  const delta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  const monthStart = startOfMonth(new Date());
  const workoutsThisMonth = finishedSessions.filter((s) => new Date(s.startedAt) >= monthStart).length;

  const prs = recentPRs(working, 7).slice(0, 5);
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  const lastTrainedAt = new Map<string, string>();
  for (const s of working) {
    const prev = lastTrainedAt.get(s.exerciseId);
    if (!prev || s.completedAt > prev) lastTrainedAt.set(s.exerciseId, s.completedAt);
  }
  // Every configured kg/lb exercise is selectable, trained or not — recently-trained ones (and
  // categories containing them) sort first, everything else falls back to alphabetical.
  const trackableExercises = exercises.filter((e) => !e.archived && (e.unit === 'kg' || e.unit === 'lb'));

  const categoryLastTrained = new Map<string, string>();
  for (const e of trackableExercises) {
    const t = lastTrainedAt.get(e.id);
    if (!t) continue;
    const prev = categoryLastTrained.get(e.category);
    if (!prev || t > prev) categoryLastTrained.set(e.category, t);
  }
  const trackableCategories = [...new Set(trackableExercises.map((e) => e.category))].sort((a, b) => {
    const ta = categoryLastTrained.get(a);
    const tb = categoryLastTrained.get(b);
    if (ta && tb) return tb.localeCompare(ta);
    if (ta && !tb) return -1;
    if (!ta && tb) return 1;
    return a.localeCompare(b);
  });
  const effectiveCategory =
    trackedCategory && trackableCategories.includes(trackedCategory) ? trackedCategory : (trackableCategories[0] ?? null);

  const exercisesInCategory = trackableExercises
    .filter((e) => e.category === effectiveCategory)
    .sort((a, b) => {
      const ta = lastTrainedAt.get(a.id);
      const tb = lastTrainedAt.get(b.id);
      if (ta && tb) return tb.localeCompare(ta);
      if (ta && !tb) return -1;
      if (!ta && tb) return 1;
      return a.name.localeCompare(b.name);
    });
  const effectiveTrackedId =
    trackedExerciseId && exercisesInCategory.some((e) => e.id === trackedExerciseId)
      ? trackedExerciseId
      : (exercisesInCategory[0]?.id ?? null);
  const trackedExercise = exercisesInCategory.find((e) => e.id === effectiveTrackedId);
  const progressData = trackedExercise
    ? sessionBests(working.filter((s) => s.exerciseId === trackedExercise.id)).map((row) => ({
        date: new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: row.weight,
        e1rm: row.e1rm,
      }))
    : [];

  const categoryOf = new Map(exercises.map((e) => [e.id, e.category]));
  const { buckets: weeklyByCategory, categories: volumeCategories } = weeklyVolumeByCategory(working, categoryOf, 8);
  const weeklyChartData = weeklyByCategory.map((b) => {
    const row: Record<string, number | string> = { label: b.label };
    for (const cat of volumeCategories) row[cat] = Math.round(b.byCategory[cat] ?? 0);
    return row;
  });

  const sortedBW = [...bodyWeights].sort((a, b) => a.date.localeCompare(b.date));
  const latestBW = sortedBW[sortedBW.length - 1];
  const prevBW = sortedBW[sortedBW.length - 2];
  const bwDelta = latestBW && prevBW ? latestBW.weight - prevBW.weight : null;
  const bwChartData = sortedBW.slice(-10).map((e) => ({
    date: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    weight: e.weight,
  }));

  return (
    <div className="px-4 pt-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          <h1 className="text-2xl font-bold">
            Your <span className="accent-text">Progress</span>
          </h1>
        </div>
        <Link
          to="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-dim)] transition active:scale-90"
          aria-label="Settings"
        >
          <SettingsIcon size={17} />
        </Link>
      </div>

      {activeSession ? (
        <Link
          to={`/workout/${activeSession.id}`}
          className="card-bevel mb-5 flex items-center justify-between rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-primary)]/12 px-4 py-3.5 transition active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]">
              <Play size={18} fill="white" className="text-white" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-dim)]">Workout in progress</div>
              <div className="font-semibold">Continue session</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-[var(--color-text-faint)]" />
        </Link>
      ) : (
        <Link
          to="/train"
          className="btn-glow-lime mb-5 flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-[var(--color-text)] active:scale-[0.98]"
        >
          Start Workout
          <ChevronRight size={20} />
        </Link>
      )}

      <div className="mb-3 grid grid-cols-3 gap-2">
        <StatCard
          label="Streak"
          value={`${streak}`}
          sub={streak === 1 ? 'day' : 'days'}
          icon={<Flame size={16} />}
          accent="var(--color-amber)"
        />
        <StatCard
          label="This wk"
          value={formatVolume(thisWeek)}
          sub={delta == null ? 'volume' : `${delta >= 0 ? '+' : ''}${delta}% wk`}
          icon={<TrendingUp size={16} />}
          accent="var(--color-lime)"
        />
        <StatCard
          label="This mo"
          value={`${workoutsThisMonth}`}
          sub="workouts"
          icon={<CalendarCheck size={16} />}
          accent="var(--color-azure)"
        />
      </div>

      <div className="card-bevel mb-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-dim)]">Weekly Volume</h2>
        </div>
        {thisWeek === 0 && lastWeek === 0 && weekly.every((w) => w.volume === 0) ? (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--color-text-faint)]">
            Log a workout to see your volume trend
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs text-[var(--color-text-faint)]">
              Per week, split by body part
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weeklyChartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis hide domain={[0, 'dataMax']} />
                <Tooltip cursor={{ fill: 'var(--color-surface-2)' }} content={<VolumeTooltip />} />
                {volumeCategories.map((cat, i) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="volume"
                    fill={categoryColorInSet(cat, volumeCategories)}
                    maxBarSize={22}
                    isAnimationActive={false}
                    radius={i === volumeCategories.length - 1 ? [6, 6, 0, 0] : undefined}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {volumeCategories.map((cat) => (
                <span key={cat} className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-text-faint)]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: categoryColorInSet(cat, volumeCategories) }} />
                  {cat}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card-bevel mb-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-dim)]">
          <TrendingUp size={14} />
          Strength Progress
        </h2>
        {trackableCategories.length > 0 && (
          <div className="mb-2 flex gap-1.5">
            <select
              value={effectiveCategory ?? ''}
              onChange={(e) => {
                setTrackedCategory(e.target.value);
                setTrackedExerciseId(null);
              }}
              className="min-w-0 flex-1 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium outline-none"
            >
              {trackableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={effectiveTrackedId ?? ''}
              onChange={(e) => setTrackedExerciseId(e.target.value)}
              className="min-w-0 flex-1 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium outline-none"
            >
              {exercisesInCategory.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {!trackedExercise || progressData.length < 2 ? (
          <div className="flex h-32 items-center justify-center px-4 text-center text-sm text-[var(--color-text-faint)]">
            Log at least two sessions of a kg or lb exercise to see a trend
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={progressData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
                  formatter={(v, name) => [
                    formatWeight(Number(v), trackedExercise.unit),
                    name === 'e1rm' ? 'Est. 1RM' : 'Max weight',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  name="weight"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--color-primary)' }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="e1rm"
                  name="e1rm"
                  stroke="var(--color-crimson)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--color-crimson)' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-text-faint)]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--color-primary)' }} />
                Max weight
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-text-faint)]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--color-crimson)' }} />
                Est. 1RM
              </span>
            </div>
          </>
        )}
      </div>

      <div className="card-bevel mb-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-dim)]">
            <Scale size={14} />
            Body Weight
          </h2>
          <button
            onClick={() => setBwSheet('add')}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-2)] transition active:scale-90"
            aria-label="Log body weight"
          >
            <Plus size={14} />
          </button>
        </div>
        {!latestBW ? (
          <div className="flex h-20 items-center justify-center text-sm text-[var(--color-text-faint)]">
            Log your weight to start tracking
          </div>
        ) : (
          <>
            <button
              onClick={() => setBwSheet(latestBW)}
              className="mb-1 flex items-center gap-2 transition active:opacity-70"
              aria-label="Edit latest body weight"
            >
              <span className="text-2xl font-bold tabular-nums">
                {trimNum(latestBW.weight)}
                {latestBW.unit}
              </span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-faint)]">
                <Pencil size={11} />
              </span>
              {bwDelta != null && (
                <span className="text-xs font-medium text-[var(--color-text-faint)]">
                  {bwDelta > 0 ? '+' : ''}
                  {trimNum(Math.round(bwDelta * 10) / 10)}
                  {latestBW.unit} vs last
                </span>
              )}
            </button>
            {bwChartData.length > 1 && (
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={bwChartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${trimNum(Number(v))} ${latestBW.unit}`, 'Weight']}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: 'var(--color-primary)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </div>

      <div className="mb-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-dim)]">
          <Trophy size={15} className="text-[var(--color-amber)]" />
          Recent PRs
        </h2>
        {prs.length === 0 ? (
          <EmptyState title="No PRs yet" sub="New personal bests from the last 7 days will show up here" />
        ) : (
          <div className="flex flex-col gap-2">
            {prs.map((pr) => {
              const ex = exerciseById.get(pr.exerciseId);
              return (
                <Link
                  key={`${pr.exerciseId}-${pr.achievedAt}`}
                  to={`/exercises/${pr.exerciseId}`}
                  className="card-bevel flex items-center justify-between rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 transition active:scale-[0.98]"
                >
                  <div>
                    <div className="text-sm font-medium">{ex?.name ?? 'Exercise'}</div>
                    <div className="text-xs text-[var(--color-text-faint)]">
                      {new Date(pr.achievedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="rounded-full bg-[var(--color-amber)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--color-amber)]">
                    {ex ? formatWeight(pr.weight, ex.unit) : pr.weight} × {pr.reps}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {bwSheet && (
        <LogBodyWeightSheet
          defaultUnit={latestBW?.unit ?? 'kg'}
          editEntry={typeof bwSheet === 'object' ? bwSheet : undefined}
          onClose={() => setBwSheet(null)}
        />
      )}
    </div>
  );
}
