import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorkoutSession, SetEntry, Exercise, Routine } from '../data/types';
import { categoryColor } from '../lib/categoryColors';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WorkoutCalendar({
  sessions,
  sets,
  exercises,
  routines,
}: {
  sessions: WorkoutSession[];
  sets: SetEntry[];
  exercises: Exercise[];
  routines: Routine[];
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const finishedSessions = useMemo(() => sessions.filter((s) => s.endedAt), [sessions]);
  const routineById = useMemo(() => new Map(routines.map((r) => [r.id, r])), [routines]);
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const sessionCategories = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const s of sets) {
      const ex = exerciseById.get(s.exerciseId);
      if (!ex) continue;
      if (!map.has(s.sessionId)) map.set(s.sessionId, new Set());
      map.get(s.sessionId)!.add(ex.category);
    }
    return map;
  }, [sets, exerciseById]);

  const dayMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const session of finishedSessions) {
      const key = format(parseISO(session.startedAt), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(session.id);
    }
    return map;
  }, [finishedSessions]);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end }).map((date) => {
      const key = format(date, 'yyyy-MM-dd');
      const sessionIds = dayMap.get(key) ?? [];
      const categories = new Set<string>();
      for (const id of sessionIds) {
        for (const cat of sessionCategories.get(id) ?? []) categories.add(cat);
      }
      return { date, key, categories: [...categories], sessionIds };
    });
  }, [viewMonth, dayMap, sessionCategories]);

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 40) {
      setViewMonth((m) => (dx < 0 ? addMonths(m, 1) : subMonths(m, 1)));
    }
  }

  const hasAnyWorkouts = finishedSessions.length > 0;
  const selectedDay = gridDays.find((d) => d.key === selectedKey) ?? null;
  const selectedSessions = (selectedDay?.sessionIds ?? [])
    .map((id) => finishedSessions.find((s) => s.id === id))
    .filter((s): s is WorkoutSession => !!s)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)]"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-sm font-semibold">{format(viewMonth, 'MMMM yyyy')}</h2>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)]"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-[var(--color-text-faint)]">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {gridDays.map((day) => {
          const inMonth = isSameMonth(day.date, viewMonth);
          const hasWorkout = day.categories.length > 0;
          const selected = selectedKey === day.key;
          return (
            <button
              key={day.key}
              onClick={() => hasWorkout && setSelectedKey(selected ? null : day.key)}
              disabled={!hasWorkout}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-xs transition-colors ${
                selected
                  ? 'bg-[var(--color-primary)]/20 ring-2 ring-[var(--color-primary)]'
                  : hasWorkout
                    ? 'border-2 border-[var(--color-border)] bg-[var(--color-surface)]'
                    : ''
              } ${!inMonth ? 'opacity-30' : ''}`}
            >
              <span
                className={
                  isToday(day.date)
                    ? 'font-bold text-[var(--color-primary)]'
                    : hasWorkout
                      ? 'text-[var(--color-text)]'
                      : 'text-[var(--color-text-faint)]'
                }
              >
                {format(day.date, 'd')}
              </span>
              <span className="flex h-1.5 gap-1">
                {day.categories.slice(0, 4).map((cat) => (
                  <span
                    key={cat}
                    className="h-1.5 w-1.5 rotate-45"
                    style={{ background: categoryColor(cat) }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {!hasAnyWorkouts && (
        <p className="mt-4 text-center text-sm text-[var(--color-text-faint)]">
          Finished workouts will show up here by the day they were trained.
        </p>
      )}

      {selectedDay && selectedSessions.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
            {format(selectedDay.date, 'EEEE, MMM d')}
          </div>
          {selectedSessions.map((session) => {
            const cats = [...(sessionCategories.get(session.id) ?? [])];
            return (
              <Link
                key={session.id}
                to={`/history/${session.id}`}
                className="card-bevel rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 transition active:scale-[0.98]"
              >
                <div className="text-sm font-medium">{routineById.get(session.routineId)?.name ?? 'Workout'}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {cats.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-bold text-[#fffdf5]"
                      style={{ background: categoryColor(cat) }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
