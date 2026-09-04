import { startOfWeek, endOfWeek, subWeeks, format, isSameDay, parseISO, differenceInCalendarDays } from 'date-fns';
import type { SetEntry, WorkoutSession, WeightUnit } from '../data/types';

export function estOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

/** Excludes warm-up sets — PRs, volume, and progress trends should reflect working sets only. */
export function workingSets(sets: SetEntry[]): SetEntry[] {
  return sets.filter((s) => !s.isWarmup);
}

export const WEIGHT_INCREMENT: Record<WeightUnit, number> = {
  kg: 2.5,
  lb: 5,
  stack: 1,
  bodyweight: 2.5,
};

const REP_CEILING = 12;
const REP_RESET = 8;

export interface ProgressionSuggestion {
  weight: number;
  reps: number;
  reason: string;
}

/** Simple double-progression rule: add a rep each time until a rep ceiling, then add weight and drop back down. */
export function suggestNextTarget(last: SetEntry): ProgressionSuggestion {
  if (last.unit === 'bodyweight' && last.weight === 0) {
    return { weight: 0, reps: last.reps + 1, reason: `${last.reps} last time — try ${last.reps + 1}` };
  }
  if (last.reps >= REP_CEILING) {
    const inc = WEIGHT_INCREMENT[last.unit];
    return {
      weight: Math.round((last.weight + inc) * 100) / 100,
      reps: REP_RESET,
      reason: `Hit ${last.reps} reps last time — add weight`,
    };
  }
  return {
    weight: last.weight,
    reps: last.reps + 1,
    reason: `${last.reps} last time — try 1 more rep`,
  };
}

export function volumeOf(sets: SetEntry[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function weekBounds(date: Date) {
  return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
}

export function weeklyVolumeSeries(sets: SetEntry[], weeks = 8) {
  const now = new Date();
  const buckets: { label: string; volume: number; weekStart: Date }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekDate = subWeeks(now, i);
    const { start, end } = weekBounds(weekDate);
    const volume = sets
      .filter((s) => {
        const d = parseISO(s.completedAt);
        return d >= start && d <= end;
      })
      .reduce((sum, s) => sum + s.weight * s.reps, 0);
    buckets.push({ label: format(start, 'MMM d'), volume: Math.round(volume), weekStart: start });
  }
  return buckets;
}

export interface WeeklyCategoryBucket {
  label: string;
  weekStart: Date;
  total: number;
  byCategory: Record<string, number>;
}

/** Same weekly bucketing as weeklyVolumeSeries, but volume is also split out per exercise category. */
export function weeklyVolumeByCategory(
  sets: SetEntry[],
  categoryOf: Map<string, string>,
  weeks = 8
): { buckets: WeeklyCategoryBucket[]; categories: string[] } {
  const now = new Date();
  const buckets: WeeklyCategoryBucket[] = [];
  const categoriesSeen = new Set<string>();
  for (let i = weeks - 1; i >= 0; i--) {
    const weekDate = subWeeks(now, i);
    const { start, end } = weekBounds(weekDate);
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const s of sets) {
      const d = parseISO(s.completedAt);
      if (d < start || d > end) continue;
      const category = categoryOf.get(s.exerciseId) ?? 'Other';
      const vol = s.weight * s.reps;
      byCategory[category] = (byCategory[category] ?? 0) + vol;
      total += vol;
      categoriesSeen.add(category);
    }
    buckets.push({ label: format(start, 'MMM d'), weekStart: start, total: Math.round(total), byCategory });
  }
  return { buckets, categories: [...categoriesSeen] };
}

export function currentStreak(sessions: WorkoutSession[]): number {
  const days = Array.from(
    new Set(sessions.map((s) => format(parseISO(s.startedAt), 'yyyy-MM-dd')))
  )
    .map((d) => parseISO(d))
    .sort((a, b) => b.getTime() - a.getTime());

  if (days.length === 0) return 0;

  const today = new Date();
  const isToday = isSameDay(days[0], today);

  if (!isToday && differenceInCalendarDays(today, days[0]) !== 1) {
    return 0;
  }

  let streak = 0;
  let expected = isToday ? today : days[0];
  for (let i = 0; i < days.length; i++) {
    if (isSameDay(days[i], expected)) {
      streak++;
      expected = new Date(expected.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

export interface PersonalRecord {
  exerciseId: string;
  weight: number;
  reps: number;
  achievedAt: string;
}

/** For each exercise, returns its all-time best set (by weight, tie-break by reps). */
export function personalRecords(sets: SetEntry[]): Map<string, PersonalRecord> {
  const byExercise = new Map<string, SetEntry[]>();
  for (const s of sets) {
    const arr = byExercise.get(s.exerciseId) ?? [];
    arr.push(s);
    byExercise.set(s.exerciseId, arr);
  }
  const result = new Map<string, PersonalRecord>();
  for (const [exId, exSets] of byExercise) {
    const sorted = [...exSets].sort(
      (a, b) => parseISO(a.completedAt).getTime() - parseISO(b.completedAt).getTime()
    );
    let best: PersonalRecord | null = null;
    for (const s of sorted) {
      if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
        best = { exerciseId: exId, weight: s.weight, reps: s.reps, achievedAt: s.completedAt };
      }
    }
    if (best) result.set(exId, best);
  }
  return result;
}

/** Sets that were a new all-time-best weight for their exercise at the moment they were logged, within the last N days. */
export function recentPRs(sets: SetEntry[], withinDays = 7): (PersonalRecord & { exerciseId: string })[] {
  const byExercise = new Map<string, SetEntry[]>();
  for (const s of sets) {
    const arr = byExercise.get(s.exerciseId) ?? [];
    arr.push(s);
    byExercise.set(s.exerciseId, arr);
  }
  const cutoff = Date.now() - withinDays * 86400000;
  const prs: (PersonalRecord & { exerciseId: string })[] = [];
  for (const [exId, exSets] of byExercise) {
    const sorted = [...exSets].sort(
      (a, b) => parseISO(a.completedAt).getTime() - parseISO(b.completedAt).getTime()
    );
    let runningMax = -Infinity;
    for (const s of sorted) {
      if (s.weight > runningMax) {
        runningMax = s.weight;
        if (parseISO(s.completedAt).getTime() >= cutoff) {
          prs.push({ exerciseId: exId, weight: s.weight, reps: s.reps, achievedAt: s.completedAt });
        }
      }
    }
  }
  return prs.sort((a, b) => parseISO(b.achievedAt).getTime() - parseISO(a.achievedAt).getTime());
}

export function topSetOf(sets: SetEntry[]): SetEntry | null {
  if (sets.length === 0) return null;
  return [...sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
}
