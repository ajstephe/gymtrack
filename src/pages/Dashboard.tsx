import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Flame, TrendingUp, CalendarCheck, Trophy, ChevronRight, Play } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { db } from '../data/db';
import { useSessionStore } from '../store/sessionStore';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { currentStreak, weeklyVolumeSeries, recentPRs } from '../lib/calculations';
import { formatVolume, formatWeight } from '../lib/format';
import { startOfMonth } from 'date-fns';

export function Dashboard() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const sets = useLiveQuery(() => db.sets.toArray(), []) ?? [];
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];
  const activeSessionId = useSessionStore((s) => s.activeSessionId);

  const finishedSessions = sessions.filter((s) => s.endedAt);
  const activeSession = sessions.find((s) => s.id === activeSessionId && !s.endedAt);

  const streak = currentStreak(finishedSessions);
  const weekly = weeklyVolumeSeries(sets, 8);
  const thisWeek = weekly[weekly.length - 1]?.volume ?? 0;
  const lastWeek = weekly[weekly.length - 2]?.volume ?? 0;
  const delta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  const monthStart = startOfMonth(new Date());
  const workoutsThisMonth = finishedSessions.filter((s) => new Date(s.startedAt) >= monthStart).length;

  const prs = recentPRs(sets, 7).slice(0, 5);
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  return (
    <div className="px-4 pt-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          <h1 className="text-2xl font-bold">
            Your <span className="gradient-text">Progress</span>
          </h1>
        </div>
      </div>

      {activeSession ? (
        <Link
          to={`/workout/${activeSession.id}`}
          className="mb-5 flex items-center justify-between rounded-2xl border border-[var(--color-primary)]/40 bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-primary-2)]/20 px-4 py-3.5"
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
          className="mb-5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-2)] px-4 py-3.5 font-semibold text-white shadow-lg shadow-[var(--color-primary)]/20"
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
          label="This week"
          value={formatVolume(thisWeek)}
          sub={delta == null ? 'volume' : `${delta >= 0 ? '+' : ''}${delta}% wk`}
          icon={<TrendingUp size={16} />}
          accent="var(--color-lime)"
        />
        <StatCard
          label="This month"
          value={`${workoutsThisMonth}`}
          sub="workouts"
          icon={<CalendarCheck size={16} />}
          accent="var(--color-azure)"
        />
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
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
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5"
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
    </div>
  );
}
