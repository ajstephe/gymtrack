import { useState } from 'react';
import { ChevronDown, Check, X, Flame, Plus, Minus, SlidersHorizontal, Repeat, Trophy } from 'lucide-react';
import { formatWeight, trimNum } from '../lib/format';
import type { Exercise, SetEntry } from '../data/types';
import type { PersonalRecord, ProgressionSuggestion } from '../lib/calculations';
import { ExercisePhotoThumb, ExercisePhotoButton } from './ExercisePhoto';
import { Collapse } from './Collapse';
import { SwipeToDelete } from './SwipeToDelete';

const REST_PRESETS = [60, 90, 120, 180];
const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const WEIGHT_UNIT_OPTIONS = ['kg', 'lb', 'stack'] as const;

export interface Draft {
  weight: string;
  reps: string;
  rpe: string;
  warmup: boolean;
}

interface SetEditDraft {
  weight: string;
  reps: string;
  rpe: string;
}

export function ExerciseCard({
  ex,
  isOpen,
  onToggleOpen,
  logged,
  last,
  lastTop,
  suggestion,
  personalBest,
  draft,
  onUpdateDraft,
  onLogSet,
  onQuickRepeat,
  onSetUnit,
  onBumpWeight,
  onBumpReps,
  onUpdateSetupNote,
  editingSetId,
  editDraft,
  onEditDraftChange,
  onStartEditSet,
  onSaveEditSet,
  onCancelEditSet,
  onDeleteSet,
  restDuration,
  onSetRestDuration,
}: {
  ex: Exercise;
  isOpen: boolean;
  onToggleOpen: () => void;
  logged: SetEntry[];
  last: SetEntry[] | null;
  lastTop: SetEntry | null;
  suggestion: ProgressionSuggestion | null;
  personalBest: PersonalRecord | null;
  draft: Draft;
  onUpdateDraft: (patch: Partial<Draft>) => void;
  onLogSet: () => void;
  onQuickRepeat: () => void;
  onSetUnit: (unit: 'kg' | 'lb' | 'stack') => void;
  onBumpWeight: (delta: 1 | -1) => void;
  onBumpReps: (delta: 1 | -1) => void;
  onUpdateSetupNote: (note: string) => void;
  editingSetId: string | null;
  editDraft: SetEditDraft;
  onEditDraftChange: (patch: Partial<SetEditDraft>) => void;
  onStartEditSet: (s: SetEntry) => void;
  onSaveEditSet: (s: SetEntry) => void;
  onCancelEditSet: () => void;
  onDeleteSet: (id: string) => void;
  restDuration: number;
  onSetRestDuration: (n: number) => void;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  function startEditNote() {
    setNoteDraft(ex.setupNote ?? '');
    setEditingNote(true);
  }

  function commitNote() {
    onUpdateSetupNote(noteDraft.trim());
    setEditingNote(false);
  }

  return (
    <div
      id={`ex-${ex.id}`}
      className="card-bevel overflow-hidden rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] transition-colors"
    >
      <div className="flex items-center">
        <button
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition active:bg-[var(--color-surface-2)]"
        >
          <ExercisePhotoThumb exerciseId={ex.id} size={36} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{ex.name}</span>
              {logged.length > 0 && (
                <span className="shrink-0 rounded-full bg-[var(--color-lime)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text)]">
                  {logged.length} set{logged.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="truncate text-xs text-[var(--color-text-faint)]">
              {ex.setupNote && <span>{ex.setupNote} · </span>}
              {lastTop ? (
                <span>
                  Last: {formatWeight(lastTop.weight, ex.unit)} × {lastTop.reps}
                </span>
              ) : (
                <span>No history yet</span>
              )}
            </div>
          </div>
          <ChevronDown
            size={18}
            className={`ml-2 shrink-0 text-[var(--color-text-faint)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {logged.length > 0 && !isOpen && (
          <button
            onClick={onQuickRepeat}
            className="mr-3 shrink-0 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] p-2 text-[var(--color-text-dim)] transition active:scale-90"
            aria-label={`Repeat last set for ${ex.name}`}
          >
            <Repeat size={15} />
          </button>
        )}
      </div>

      <Collapse open={isOpen}>
        <div
          className={`border-t px-4 py-3.5 transition-colors ${
            isOpen ? 'border-[var(--color-border)]' : 'border-transparent'
          }`}
        >
          <div className="mb-3 flex items-center gap-2.5">
            <ExercisePhotoButton exerciseId={ex.id} size={44} />
            {editingNote ? (
              <div className="flex flex-1 items-center gap-1.5">
                <input
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNote();
                    if (e.key === 'Escape') setEditingNote(false);
                  }}
                  onBlur={commitNote}
                  placeholder="Setup note (seat/pin)"
                  className="min-w-0 flex-1 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-xs outline-none"
                />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={commitNote}
                  className="shrink-0 text-[var(--color-primary)] transition active:scale-90"
                  aria-label="Save note"
                >
                  <Check size={16} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditNote}
                className="min-w-0 flex-1 truncate text-left text-xs text-[var(--color-text-faint)] transition active:opacity-70"
              >
                {ex.setupNote ?? 'Snap a photo so you remember this machine — tap to add a setup note'}
              </button>
            )}
          </div>

          {personalBest && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-[var(--color-amber)]/12 px-3 py-2">
              <Trophy size={14} className="shrink-0 text-[var(--color-amber)]" />
              <span className="text-xs font-medium text-[var(--color-text-dim)]">
                Personal best:{' '}
                <span className="font-bold text-[var(--color-text)]">
                  {formatWeight(personalBest.weight, ex.unit)} × {personalBest.reps}
                </span>
              </span>
            </div>
          )}

          {last && last.length > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                Last time ·{' '}
                {new Date(last[0].completedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  let workingIndex = 0;
                  return last.map((s) => {
                    if (!s.isWarmup) workingIndex++;
                    return (
                      <span
                        key={s.id}
                        className="rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium tabular-nums"
                      >
                        {s.isWarmup ? <span className="text-[var(--color-amber)]">W</span> : workingIndex}. {formatWeight(s.weight, s.unit)} × {s.reps}
                        {s.rpe != null && (
                          <span className="ml-1 font-normal text-[var(--color-text-faint)]">RPE {trimNum(s.rpe)}</span>
                        )}
                      </span>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {suggestion && (
            <button
              type="button"
              onClick={() => onUpdateDraft({ weight: String(suggestion.weight), reps: String(suggestion.reps) })}
              className="mb-3 flex w-full items-center justify-between rounded-xl bg-[var(--color-primary)]/12 px-3.5 py-2.5 text-left transition active:scale-[0.98]"
            >
              <span className="text-xs text-[var(--color-text-dim)]">{suggestion.reason}</span>
              <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-xs font-semibold text-white">
                {ex.unit === 'bodyweight' && suggestion.weight === 0
                  ? `${suggestion.reps} reps`
                  : `${formatWeight(suggestion.weight, ex.unit)} × ${suggestion.reps}`}
              </span>
            </button>
          )}

          {logged.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              {(() => {
                let workingIndex = 0;
                return logged.map((s) => {
                  if (!s.isWarmup) workingIndex++;
                  const label = s.isWarmup ? 'Warm-up' : `Set ${workingIndex}`;
                  const isEditing = editingSetId === s.id;

                  if (isEditing) {
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-sm"
                      >
                        <span
                          className={`shrink-0 ${s.isWarmup ? 'font-medium text-[var(--color-amber)]' : 'text-[var(--color-text-faint)]'}`}
                        >
                          {label}
                        </span>
                        <input
                          autoFocus
                          type="number"
                          inputMode="decimal"
                          value={editDraft.weight}
                          onChange={(e) => onEditDraftChange({ weight: e.target.value })}
                          className="w-16 min-w-0 rounded-md border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-1 text-center font-mono text-sm font-bold outline-none"
                        />
                        <span className="shrink-0 text-[var(--color-text-faint)]">×</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={editDraft.reps}
                          onChange={(e) => onEditDraftChange({ reps: e.target.value })}
                          className="w-12 min-w-0 rounded-md border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-1 text-center font-mono text-sm font-bold outline-none"
                        />
                        <select
                          value={editDraft.rpe}
                          onChange={(e) => onEditDraftChange({ rpe: e.target.value })}
                          className="min-w-0 rounded-md border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-1 text-xs outline-none"
                        >
                          <option value="">RPE</option>
                          {RPE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {trimNum(r)}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => onSaveEditSet(s)}
                          className="ml-auto shrink-0 text-[var(--color-primary)] transition active:scale-90"
                          aria-label="Save set"
                        >
                          <Check size={16} strokeWidth={3} />
                        </button>
                        <button
                          onClick={onCancelEditSet}
                          className="shrink-0 text-[var(--color-text-faint)] transition active:scale-90"
                          aria-label="Cancel edit"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <SwipeToDelete
                      key={s.id}
                      onDelete={() => onDeleteSet(s.id)}
                      ariaLabel="Delete set"
                      railBg="var(--color-surface-2)"
                    >
                      <button
                        onClick={() => onStartEditSet(s)}
                        className="flex w-full items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-left text-sm"
                      >
                        <span
                          className={s.isWarmup ? 'font-medium text-[var(--color-amber)]' : 'text-[var(--color-text-faint)]'}
                        >
                          {label}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatWeight(s.weight, s.unit)} × {s.reps}
                          {s.rpe != null && (
                            <span className="ml-1.5 font-normal text-[var(--color-text-faint)]">
                              RPE {trimNum(s.rpe)}
                            </span>
                          )}
                        </span>
                      </button>
                    </SwipeToDelete>
                  );
                });
              })()}
            </div>
          )}

          <div className="mb-2.5 flex gap-2">
            <label className="flex-1">
              <span className="mb-1 flex h-5 items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">Weight</span>
                <span className="flex shrink-0 overflow-hidden rounded-full border-2 border-[var(--color-border)]">
                  {WEIGHT_UNIT_OPTIONS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => onSetUnit(u)}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold transition active:scale-95 ${
                        ex.unit === u
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-surface-2)] text-[var(--color-text-faint)]'
                      }`}
                    >
                      {u === 'stack' ? 'Stack #' : u}
                    </button>
                  ))}
                </span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onBumpWeight(-1)}
                  className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-dim)] transition active:scale-90"
                  aria-label="Decrease weight"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  value={draft.weight}
                  onChange={(e) => onUpdateDraft({ weight: e.target.value })}
                  placeholder="0"
                  className="w-full min-w-0 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-2.5 text-center font-mono text-xl font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={() => onBumpWeight(1)}
                  className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-dim)] transition active:scale-90"
                  aria-label="Increase weight"
                >
                  <Plus size={14} />
                </button>
              </div>
            </label>
            <label className="flex-1">
              <span className="mb-1 flex h-5 items-center text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                Reps
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onBumpReps(-1)}
                  className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-dim)] transition active:scale-90"
                  aria-label="Decrease reps"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={draft.reps}
                  onChange={(e) => onUpdateDraft({ reps: e.target.value })}
                  placeholder="0"
                  className="w-full min-w-0 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-2.5 text-center font-mono text-xl font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={() => onBumpReps(1)}
                  className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-dim)] transition active:scale-90"
                  aria-label="Increase reps"
                >
                  <Plus size={14} />
                </button>
              </div>
            </label>
          </div>

          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={() => onUpdateDraft({ warmup: !draft.warmup })}
              className={`flex shrink-0 items-center gap-1 rounded-full border-2 border-[var(--color-border)] px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                draft.warmup
                  ? 'bg-[var(--color-amber)] text-[var(--color-text)]'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'
              }`}
            >
              <Flame size={12} /> Warm-up
            </button>
            <button
              type="button"
              onClick={() => setOptionsOpen((o) => !o)}
              className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-dim)] transition active:scale-95"
            >
              <SlidersHorizontal size={12} />
              Options
              {(draft.rpe !== '' || restDuration !== 90) && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              )}
              <ChevronDown size={12} className={`transition-transform ${optionsOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <Collapse open={optionsOpen}>
            <div className="pb-3">
              <div className="mb-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                    <span aria-hidden="true">😣</span> Rate of Perceived Exertion (RPE)
                    {draft.rpe !== '' ? ` — ${trimNum(parseFloat(draft.rpe))}` : ''}
                  </span>
                  {draft.rpe !== '' && (
                    <button
                      onClick={() => onUpdateDraft({ rpe: '' })}
                      className="text-[10px] font-bold uppercase text-[var(--color-text-faint)] underline active:text-[var(--color-danger)]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative h-5 overflow-hidden rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  <div
                    className="absolute inset-y-0 left-0 transition-[width]"
                    style={{
                      width:
                        draft.rpe !== ''
                          ? `${((RPE_OPTIONS.indexOf(parseFloat(draft.rpe)) + 1) / RPE_OPTIONS.length) * 100}%`
                          : '0%',
                      background: 'linear-gradient(90deg, var(--color-lime), var(--color-amber), var(--color-crimson))',
                    }}
                  />
                  <div className="absolute inset-0 flex">
                    {RPE_OPTIONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => onUpdateDraft({ rpe: String(r) })}
                        aria-label={`RPE ${trimNum(r)}`}
                        className="flex-1 border-r-2 border-[var(--color-border)]/50 last:border-r-0 active:scale-y-90"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">Rest</span>
                {REST_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => onSetRestDuration(p)}
                    className={`rounded-full border-2 border-[var(--color-border)] px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                      restDuration === p
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'
                    }`}
                  >
                    {p}s
                  </button>
                ))}
              </div>
            </div>
          </Collapse>

          <button
            onClick={onLogSet}
            disabled={!draft.reps || (!draft.weight && ex.unit !== 'bodyweight')}
            className="btn-glow-lime flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
          >
            <Check size={17} strokeWidth={3} /> Log Set
          </button>
        </div>
      </Collapse>
    </div>
  );
}
