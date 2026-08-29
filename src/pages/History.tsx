import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { db } from '../data/db';
import { EmptyState } from '../components/EmptyState';
import { formatVolume } from '../lib/format';

export function History() {
  const sessions = useLiveQuery(async () => {
    const all = await db.sessions.toArray();
    return all.filter((s) => s.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, []);
  const routines = useLiveQuery(() => db.routines.toArray(), []) ?? [];
  const sets = useLiveQuery(() => db.sets.toArray(), []) ?? [];

  const routineById = new Map(routines.map((r) => [r.id, r]));

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-5 text-2xl font-bold">History</h1>

      {sessions == null ? null : sessions.length === 0 ? (
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
                className="flex items-center justify-between rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5"
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
