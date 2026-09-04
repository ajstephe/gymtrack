import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Plus, ChevronRight, Play, Pencil, X } from 'lucide-react';
import { db, newId } from '../data/db';
import type { Routine } from '../data/types';
import { useSessionStore } from '../store/sessionStore';
import { SwipeToDelete } from '../components/SwipeToDelete';
import { useEscapeToClose } from '../lib/useEscapeToClose';
import { ALL_PLATE_SIZES_KG } from '../lib/plates';
import { trimNum } from '../lib/format';

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
  useEscapeToClose(addingRoutine, () => setAddingRoutine(false));

  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [editName, setEditName] = useState('');
  const [editPlates, setEditPlates] = useState<number[]>(ALL_PLATE_SIZES_KG);
  useEscapeToClose(!!editingRoutine, () => setEditingRoutine(null));

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

  async function removeRoutine(id: string) {
    await db.routines.update(id, { archived: true });
  }

  function openEdit(r: Routine) {
    setEditName(r.name);
    setEditPlates(r.plateInventory ?? ALL_PLATE_SIZES_KG);
    setEditingRoutine(r);
  }

  function togglePlate(size: number) {
    setEditPlates((prev) => (prev.includes(size) ? prev.filter((p) => p !== size) : [...prev, size]));
  }

  async function saveEdit() {
    if (!editingRoutine || !editName.trim()) return;
    await db.routines.update(editingRoutine.id, { name: editName.trim(), plateInventory: editPlates });
    setEditingRoutine(null);
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-1 text-2xl font-bold">Train</h1>
      <p className="mb-5 text-sm text-[var(--color-text-dim)]">Which gym are you at?</p>

      {activeSession && !activeSession.endedAt && (
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
      )}

      <div className="flex flex-col gap-3">
        {routines.map((r) => (
          <SwipeToDelete key={r.id} onDelete={() => removeRoutine(r.id)} ariaLabel={`Remove ${r.name}`}>
            <div className="card-bevel flex items-center rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] pr-1.5 transition active:scale-[0.99]">
              <button
                onClick={() => startWorkout(r.id)}
                disabled={!!(activeSession && !activeSession.endedAt)}
                className="flex min-w-0 flex-1 items-center justify-between px-4 py-4 text-left disabled:opacity-40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${accentColor[r.accent] ?? 'var(--color-primary)'}22` }}
                  >
                    <MapPin size={20} style={{ color: accentColor[r.accent] ?? 'var(--color-primary)' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{r.name}</div>
                    <div className="text-xs text-[var(--color-text-faint)]">
                      {exerciseCounts?.get(r.id) ?? 0} exercises set up
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-[var(--color-text-faint)]" />
              </button>
              <button
                onClick={() => openEdit(r)}
                className="shrink-0 rounded-lg p-2 text-[var(--color-text-faint)] transition active:scale-90"
                aria-label={`Edit ${r.name}`}
              >
                <Pencil size={15} />
              </button>
            </div>
          </SwipeToDelete>
        ))}

        {addingRoutine ? (
          <div className="flex items-center gap-2 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <input
              autoFocus
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createRoutine()}
              placeholder="Gym name, e.g. Fierce"
              className="flex-1 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={createRoutine}
              className="btn-glow-primary rounded-lg px-3 py-2 text-sm transition active:scale-95"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingRoutine(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] px-4 py-3.5 text-sm text-[var(--color-text-dim)] transition active:scale-[0.98]"
          >
            <Plus size={16} /> New gym
          </button>
        )}
      </div>

      {editingRoutine && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"
          onClick={() => setEditingRoutine(null)}
        >
          <div
            className="w-full max-w-[560px] rounded-t-3xl border-t-[3px] border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Edit Gym</h2>
              <button
                onClick={() => setEditingRoutine(null)}
                className="text-[var(--color-text-faint)] transition active:scale-90"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              placeholder="Gym name"
              className="mb-3 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
            />
            <div className="mb-1.5 text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
              Plates available (kg)
            </div>
            <p className="mb-2 text-xs text-[var(--color-text-faint)]">
              Used by the Plate Calculator to work out what's actually on hand here.
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {ALL_PLATE_SIZES_KG.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => togglePlate(size)}
                  className={`rounded-full border-2 border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${
                    editPlates.includes(size)
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text-faint)]'
                  }`}
                >
                  {trimNum(size)}
                </button>
              ))}
            </div>
            <button
              onClick={saveEdit}
              disabled={!editName.trim()}
              className="btn-glow-primary w-full rounded-xl py-2.5 text-sm disabled:opacity-40 disabled:shadow-none"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
