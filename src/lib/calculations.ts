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

export function toKg(weight: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? weight * 0.453592 : weight;
}

/**
 * A "stack" set is logged by pin number (1, 2, 3…), not weight, since that's what's actually
 * dialed in at the machine — but pin numbers aren't evenly spaced in kg, so summing them directly
 * (as volume math does with every other unit) would be meaningless. This maps pin number to the
 * plate's stamped kg value, read off the stack in the gym.
 */
const STACK_TO_KG: Record<number, number> = {
  1: 12.5,
  2: 15,
  3: 17.5,
  4: 23,
  5: 28.5,
  6: 34,
  7: 39.5,
  8: 45,
  9: 50.5,
  10: 56,
  11: 61.5,
  12: 67,
  13: 72.5,
  14: 78,
  15: 83.5,
  16: 89,
  17: 94.5,
  18: 100,
};
const STACK_PINS = Object.keys(STACK_TO_KG).map(Number).sort((a, b) => a - b);
const STACK_MIN_PIN = STACK_PINS[0];
const STACK_MAX_PIN = STACK_PINS[STACK_PINS.length - 1];

/** Pin number → kg, clamped to the known stack range and rounded to the nearest pin. */
export function stackToKg(pin: number): number {
  const nearest = Math.min(STACK_MAX_PIN, Math.max(STACK_MIN_PIN, Math.round(pin)));
  return STACK_TO_KG[nearest];
}

/** A set's weight for volume math — "stack" sets store a pin number, so convert those to kg. */
export function effectiveKg(set: Pick<SetEntry, 'weight' | 'unit'>): number {
  return set.unit === 'stack' ? stackToKg(set.weight) : set.weight;
}

/**
 * Rough active-calorie estimate for a resistance-training session, using the standard MET
 * (metabolic equivalent) formula: kcal = MET x body weight (kg) x duration (hours). There's no
 * heart-rate data to work from here, so MET is picked from volume moved per minute as a proxy for
 * effort — more kg shifted per minute of session time reads as a more vigorous effort. Age gets a
 * small, gentle discount past 30 since resting/active metabolic rate tends to decline gradually
 * with age. This is a ballpark for a sense of effort, not a substitute for a heart-rate monitor.
 */
export function estimateCaloriesBurned({
  bodyWeightKg,
  durationMin,
  volumeKg,
  age,
}: {
  bodyWeightKg: number;
  durationMin: number;
  volumeKg: number;
  age?: number;
}): number {
  if (durationMin <= 0 || bodyWeightKg <= 0) return 0;
  const volumePerMin = volumeKg / durationMin;
  const met = volumePerMin < 50 ? 3.5 : volumePerMin < 120 ? 5 : 6.5;
  const ageFactor = age ? Math.max(0.85, 1 - Math.max(0, age - 30) * 0.002) : 1;
  return Math.round(met * bodyWeightKg * (durationMin / 60) * ageFactor);
}

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
  return sets.reduce((sum, s) => sum + effectiveKg(s) * s.reps, 0);
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
      .reduce((sum, s) => sum + effectiveKg(s) * s.reps, 0);
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
      const vol = effectiveKg(s) * s.reps;
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
  unit: WeightUnit;
  reps: number;
  achievedAt: string;
}

/**
 * For each exercise, returns its all-time best set (by kg-equivalent weight, tie-break by reps).
 * A set's own `weight`/`unit` are carried through for display (so a "stack" PR still shows its
 * pin number, e.g. "#12"), but which set WINS is decided by effectiveKg — comparing raw numbers
 * would be wrong whenever an exercise's logged history mixes units (e.g. it was switched from kg
 * to stack at some point), since a stack pin number is nowhere near its kg-equivalent value.
 */
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
    let bestKg = -Infinity;
    for (const s of sorted) {
      const kg = effectiveKg(s);
      if (!best || kg > bestKg || (kg === bestKg && s.reps > best.reps)) {
        best = { exerciseId: exId, weight: s.weight, unit: s.unit, reps: s.reps, achievedAt: s.completedAt };
        bestKg = kg;
      }
    }
    if (best) result.set(exId, best);
  }
  return result;
}

/** Sets that were a new all-time-best weight (by kg-equivalent, see personalRecords) for their
 * exercise at the moment they were logged, within the last N days. */
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
    let runningMaxKg = -Infinity;
    for (const s of sorted) {
      const kg = effectiveKg(s);
      if (kg > runningMaxKg) {
        runningMaxKg = kg;
        if (parseISO(s.completedAt).getTime() >= cutoff) {
          prs.push({ exerciseId: exId, weight: s.weight, unit: s.unit, reps: s.reps, achievedAt: s.completedAt });
        }
      }
    }
  }
  return prs.sort((a, b) => parseISO(b.achievedAt).getTime() - parseISO(a.achievedAt).getTime());
}

/** The heaviest set (by kg-equivalent — see personalRecords) among the given sets, tie-break by reps. */
export function topSetOf(sets: SetEntry[]): SetEntry | null {
  if (sets.length === 0) return null;
  return [...sets].sort((a, b) => effectiveKg(b) - effectiveKg(a) || b.reps - a.reps)[0];
}

export interface SessionBest {
  date: string;
  /** kg-equivalent (see effectiveKg) — a "top set" trend line has to plot one consistent unit
   * across sessions, and a stack set's raw weight is a pin number, not a weight. */
  weight: number;
  reps: number;
  e1rm: number;
}

/** One exercise's top working set per session, with its estimated 1RM — for charting max weight
 * lifted vs. projected one-rep max over time. */
export function sessionBests(sets: SetEntry[]): SessionBest[] {
  const bySession = new Map<string, SetEntry[]>();
  for (const s of workingSets(sets)) {
    const arr = bySession.get(s.sessionId) ?? [];
    arr.push(s);
    bySession.set(s.sessionId, arr);
  }
  const result: SessionBest[] = [];
  for (const sessionSets of bySession.values()) {
    const top = topSetOf(sessionSets);
    if (!top) continue;
    result.push({
      date: top.completedAt,
      weight: effectiveKg(top),
      reps: top.reps,
      e1rm: Math.round(estOneRepMax(effectiveKg(top), top.reps)),
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
