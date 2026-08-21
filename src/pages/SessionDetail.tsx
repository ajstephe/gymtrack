import { useNavigate, useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { db } from '../data/db';
import { formatWeight, formatVolume, trimNum } from '../lib/format';
import { workingSets } from '../lib/calculations';

export function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const session = useLiveQuery(() => (sessionId ? db.sessions.get(sessionId) : undefined), [sessionId]);
  const routine = useLiveQuery(
    () => (session ? db.routines.get(session.routineId) : undefined),
    [session?.routineId]
  );
  const sets = useLiveQuery(
    () => (sessionId ? db.sets.where('sessionId').equals(sessionId).toArray() : []),
    [sessionId]
  );
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  if (!session || !sets) {
    return <div className="px-4 pt-16 text-center text-[var(--color-text-dim)]">Loading…</div>;
  }

  const grouped = new Map<string, typeof sets>();
  for (const s of sets) {
    const arr = grouped.get(s.exerciseId) ?? [];
    arr.push(s);
    grouped.set(s.exerciseId, arr);
  }
  for (const arr of grouped.values()) arr.sort((a, b) => a.setNumber - b.setNumber);

  const volume = workingSets(sets).reduce((sum, s) => sum + s.weight * s.reps, 0);
  const durationMin = session.endedAt
    ? Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000))
    : null;

  async function deleteSession() {
    if (!sessionId) return;
    if (!confirm('Delete this workout? This cannot be undone.')) return;
    await db.sets.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
    navigate('/history');
  }

  return (
    <div className="px-4 pt-5">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[var(--color-text-dim)]">
          <ArrowLeft size={18} />
        </button>
        <button onClick={deleteSession} className="text-[var(--color-text-faint)] active:text-[var(--color-danger)]">
          <Trash2 size={18} />
        </button>
      </div>

      <h1 className="text-2xl font-bold">{routine?.name ?? 'Workout'}</h1>
      <p className="mb-4 text-sm text-[var(--color-text-dim)]">
        {new Date(session.startedAt).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })}
      </p>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
          <div className="text-lg font-bold">{durationMin ?? '–'}</div>
          <div className="text-[10px] uppercase text-[var(--color-text-faint)]">Minutes</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
          <div className="text-lg font-bold">{sets.length}</div>
          <div className="text-[10px] uppercase text-[var(--color-text-faint)]">Sets</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
          <div className="text-lg font-bold">{formatVolume(volume)}</div>
          <div className="text-[10px] uppercase text-[var(--color-text-faint)]">Volume</div>
        </div>
      </div>

      <div className="flex flex-col gap-2 pb-6">
        {[...grouped.entries()].map(([exId, exSets]) => {
          const ex = exerciseById.get(exId);
          return (
            <div key={exId} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <Link to={`/exercises/${exId}`} className="mb-2 block font-medium">
                {ex?.name ?? 'Exercise'}
              </Link>
              <div className="flex flex-wrap gap-1.5">
                {exSets.map((s, i) => (
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
          );
        })}
      </div>
    </div>
  );
}
