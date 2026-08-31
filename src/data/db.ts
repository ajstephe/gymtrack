import Dexie, { type EntityTable } from 'dexie';
import type {
  Routine,
  Exercise,
  WorkoutSession,
  SetEntry,
  ExercisePhoto,
  BodyWeightEntry,
  CategoryOrder,
} from './types';
import { seedRoutines, seedExercises } from './seedData';

export const db = new Dexie('GymTrackerDB') as Dexie & {
  routines: EntityTable<Routine, 'id'>;
  exercises: EntityTable<Exercise, 'id'>;
  sessions: EntityTable<WorkoutSession, 'id'>;
  sets: EntityTable<SetEntry, 'id'>;
  photos: EntityTable<ExercisePhoto, 'exerciseId'>;
  bodyWeights: EntityTable<BodyWeightEntry, 'id'>;
  categoryOrders: EntityTable<CategoryOrder, 'routineId'>;
};

// Note: boolean fields (e.g. archived) are intentionally NOT indexed —
// IndexedDB keys must be numbers/strings/dates, not booleans. Filter those in JS.
db.version(1).stores({
  routines: 'id',
  exercises: 'id, routineId, category',
  sessions: 'id, routineId, startedAt, endedAt',
  sets: 'id, sessionId, exerciseId, completedAt',
});

db.version(2).stores({
  photos: 'exerciseId',
});

db.version(3).stores({
  bodyWeights: 'id, date, sessionId',
});

db.version(4).stores({
  categoryOrders: 'routineId',
});

let seedPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const routineCount = await db.routines.count();
      if (routineCount === 0) {
        await db.routines.bulkAdd(seedRoutines);
        await db.exercises.bulkAdd(
          seedExercises.map((ex) => ({ ...ex, isCustom: false }))
        );
      }
    })();
  }
  return seedPromise;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
