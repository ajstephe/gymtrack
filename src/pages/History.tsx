import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { db } from '../data/db';
import { EmptyState } from '../components/EmptyState';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import { formatVolume } from '../lib/format';

export function History() {
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const sessions = useLiveQuery(async () => {
    const all = await db.sessions.toArray();
    return all.filter((s) => s.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, []);
  const routines = useLiveQuery(() => db.routines.toArray(), []) ?? [];
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];
  const sets = useLiveQuery(() => db.sets.toArray(), []) ?? [];

  const routineById = new Map(routines.map((r) => [r.id, r]));

  return (
    <div className="px-4 pt-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">History</h1>
        <div className="flex overflow-hidden rounded-full bg-[var(--color-surface)]">
          {(['list', 'calendar'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3.5 py-1.5 text-sm font-medium capitalize ${
                view === v ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-dim)]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'calendar' ? (
        <WorkoutCalendar sessions={sessions ?? []} sets={sets} exercises={exercises} routines={routines} />
      ) : sessions == null ? null : sessions.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={28} />}
          title="No workouts yet"
          sub="Finished sessions will show up here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => {
            const sessionSets = sets.filter((x) => x.sessionId === s.id);
            const volume = sessionSets.reduce((sum, x) => sum + x.weight * x.reps, 0);
            const durationMin = s.endedAt
              ? Math.max(1, Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000))
              : null;
            return (
              <Link
                key={s.id}
                to={`/history/${s.id}`}
                className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5"
              >
                <div>
                  <div className="font-semibold">{routineById.get(s.routineId)?.name ?? 'Workout'}</div>
                  <div className="text-xs text-[var(--color-text-faint)]">
                    {new Date(s.startedAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {durationMin != null && ` · ${durationMin} min`} · {sessionSets.length} sets
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-dim)]">{formatVolume(volume)} kg</span>
                  <ChevronRight size={16} className="text-[var(--color-text-faint)]" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
