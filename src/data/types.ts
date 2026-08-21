export type WeightUnit = 'kg' | 'lb' | 'stack' | 'bodyweight';
export type WeightType = 'each' | 'total' | 'bar' | 'each_bar' | null;

export interface Routine {
  id: string;
  name: string;
  accent: string;
  archived?: boolean;
}

export interface SeedExercise {
  id: string;
  routineId: string;
  name: string;
  category: string;
  unit: WeightUnit;
  weightType: WeightType;
  setupNote?: string;
  order: number;
}

export interface Exercise {
  id: string;
  routineId: string;
  name: string;
  category: string;
  unit: WeightUnit;
  weightType: WeightType;
  setupNote?: string;
  order: number;
  isCustom?: boolean;
  archived?: boolean;
}

export interface WorkoutSession {
  id: string;
  routineId: string;
  startedAt: string;
  endedAt?: string;
  notes?: string;
}

export interface ExercisePhoto {
  exerciseId: string;
  blob: Blob;
  updatedAt: string;
}

export interface BodyWeightEntry {
  id: string;
  weight: number;
  unit: 'kg' | 'lb';
  date: string;
  sessionId?: string;
}

export interface SetEntry {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  unit: WeightUnit;
  isDropSet?: boolean;
  isWarmup?: boolean;
  rpe?: number;
  restTakenSec?: number;
  completedAt: string;
}
