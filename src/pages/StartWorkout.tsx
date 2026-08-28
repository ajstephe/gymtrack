import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Plus, ChevronRight, Play } from 'lucide-react';
import { db, newId } from '../data/db';
import { useSessionStore } from '../store/sessionStore';

const accentColor: Record<string, string> = {
  crimson: 'var(--color-crimson)',
  azure: 'var(--color-azure)',
};

export function StartWorkout() {
  const navigate = useNavigate();
  const routines = useLiveQuery(async () => (await db.routines.toArray()).filter((r) => !r.archived), []) ?? [];
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSessionId = useSessionStore((s) => s.setActiveSessionId);
  const activeSession = useLiveQuery(
    () => (activeSessionId ? db.sessions.get(activeSessionId) : undefined),
    [activeSessionId]
  );
  const [addingRoutine, setAddingRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');

  const exerciseCounts = useLiveQuery(async () => {
    const all = (await db.exercises.toArray()).filter((e) => !e.archived);
    const counts = new Map<string, number>();
    for (const ex of all) counts.set(ex.routineId, (counts.get(ex.routineId) ?? 0) + 1);
    return counts;
  }, []);

  async function startWorkout(routineId: string) {
    const session = {
      id: newId('session'),
      routineId,
      startedAt: new Date().toISOString(),
    };
    await db.sessions.add(session);
    setActiveSessionId(session.id);
    navigate(`/workout/${session.id}`);
  }

  async function createRoutine() {
    const name = newRoutineName.trim();
    if (!name) return;
    await db.routines.add({ id: newId('routine'), name, accent: 'primary' });
    setNewRoutineName('');
    setAddingRoutine(false);
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-1 text-2xl font-bold">Train</h1>
      <p className="mb-5 text-sm text-[var(--color-text-dim)]">Which gym are you at?</p>

      {activeSession && !activeSession.endedAt && (
        <Link
          to={`/workout/${activeSession.id}`}
          className="mb-5 flex items-center justify-between rounded-2xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/12 px-4 py-3.5 transition active:scale-[0.98]"
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
      )}

      <div className="flex flex-col gap-3">
        {routines.map((r) => (
          <button
            key={r.id}
            onClick={() => startWorkout(r.id)}
            disabled={!!(activeSession && !activeSession.endedAt)}
            className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-left transition active:scale-[0.98] disabled:opacity-40"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${accentColor[r.accent] ?? 'var(--color-primary)'}22` }}
              >
                <MapPin size={20} style={{ color: accentColor[r.accent] ?? 'var(--color-primary)' }} />
              </div>
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-[var(--color-text-faint)]">
                  {exerciseCounts?.get(r.id) ?? 0} exercises set up
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-[var(--color-text-faint)]" />
          </button>
        ))}

        {addingRoutine ? (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <input
              autoFocus
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createRoutine()}
              placeholder="Gym name, e.g. Fierce"
              className="flex-1 rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={createRoutine}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white transition active:scale-95"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingRoutine(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-3.5 text-sm text-[var(--color-text-dim)] transition active:scale-[0.98]"
          >
            <Plus size={16} /> New gym
          </button>
        )}
      </div>
    </div>
  );
}
