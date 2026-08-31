import { useState } from 'react';
import { X } from 'lucide-react';
import { db } from '../data/db';
import { useEscapeToClose } from '../lib/useEscapeToClose';

export function WorkoutNotesSheet({
  sessionId,
  initialNotes,
  onClose,
}: {
  sessionId: string;
  initialNotes: string;
  onClose: () => void;
}) {
  const [notesDraft, setNotesDraft] = useState(initialNotes);
  useEscapeToClose(true, onClose);

  async function save() {
    await db.sessions.update(sessionId, { notes: notesDraft.trim() || undefined });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-[560px] rounded-t-3xl border-t-[3px] border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Workout Notes</h2>
          <button onClick={onClose} className="text-[var(--color-text-faint)] transition active:scale-90" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <textarea
          autoFocus
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="How did it feel? Anything to remember for next time…"
          rows={4}
          className="mb-3 w-full resize-none rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
        />
        <button onClick={save} className="btn-glow-primary w-full rounded-xl py-2.5 text-sm">
          Save
        </button>
      </div>
    </div>
  );
}
