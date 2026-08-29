import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Flame, TrendingUp, CalendarCheck, Trophy, ChevronRight, Play, Plus, Scale, Settings as SettingsIcon } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { db } from '../data/db';
import { useSessionStore } from '../store/sessionStore';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { LogBodyWeightSheet } from '../components/LogBodyWeightSheet';
import { currentStreak, weeklyVolumeSeries, recentPRs, workingSets } from '../lib/calculations';
import { formatVolume, formatWeight, trimNum } from '../lib/format';
import { startOfMonth } from 'date-fns';

export function Dashboard() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const sets = useLiveQuery(() => db.sets.toArray(), []) ?? [];
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];
  const bodyWeights = useLiveQuery(() => db.bodyWeights.toArray(), []) ?? [];
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const [showBodyWeight, setShowBodyWeight] = useState(false);

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
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekly} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-surface-2)' }}
                contentStyle={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => [`${Number(v).toLocaleString()} kg`, 'Volume']}
              />
              <Bar dataKey="volume" radius={[6, 6, 0, 0]} fill="var(--color-primary)" maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card-bevel mb-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-dim)]">
            <Scale size={14} />
            Body Weight
          </h2>
          <button
            onClick={() => setShowBodyWeight(true)}
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
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {trimNum(latestBW.weight)}
                {latestBW.unit}
              </span>
              {bwDelta != null && (
                <span className="text-xs font-medium text-[var(--color-text-faint)]">
                  {bwDelta > 0 ? '+' : ''}
                  {trimNum(Math.round(bwDelta * 10) / 10)}
                  {latestBW.unit} vs last
                </span>
              )}
            </div>
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

      {showBodyWeight && (
        <LogBodyWeightSheet defaultUnit={latestBW?.unit ?? 'kg'} onClose={() => setShowBodyWeight(false)} />
      )}
    </div>
  );
}
