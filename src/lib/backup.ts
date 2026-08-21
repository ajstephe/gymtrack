import { db } from '../data/db';
import type { Routine, Exercise, WorkoutSession, SetEntry, BodyWeightEntry } from '../data/types';

interface BackupPhoto {
  exerciseId: string;
  dataUrl: string;
  updatedAt: string;
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  routines: Routine[];
  exercises: Exercise[];
  sessions: WorkoutSession[];
  sets: SetEntry[];
  bodyWeights: BodyWeightEntry[];
  photos: BackupPhoto[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch?.[1] ?? 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function buildBackup(): Promise<BackupData> {
  const [routines, exercises, sessions, sets, bodyWeights, photoRecords] = await Promise.all([
    db.routines.toArray(),
    db.exercises.toArray(),
    db.sessions.toArray(),
    db.sets.toArray(),
    db.bodyWeights.toArray(),
    db.photos.toArray(),
  ]);
  const photos = await Promise.all(
    photoRecords.map(async (p) => ({
      exerciseId: p.exerciseId,
      dataUrl: await blobToDataUrl(p.blob),
      updatedAt: p.updatedAt,
    }))
  );
  return { version: 1, exportedAt: new Date().toISOString(), routines, exercises, sessions, sets, bodyWeights, photos };
}

export function downloadBackup(data: BackupData) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gym-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function isValidBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    d.version === 1 &&
    Array.isArray(d.routines) &&
    Array.isArray(d.exercises) &&
    Array.isArray(d.sessions) &&
    Array.isArray(d.sets) &&
    Array.isArray(d.bodyWeights) &&
    Array.isArray(d.photos)
  );
}

/** Replaces all local data with the contents of the backup. */
export async function restoreBackup(data: BackupData): Promise<void> {
  await db.transaction(
    'rw',
    [db.routines, db.exercises, db.sessions, db.sets, db.bodyWeights, db.photos],
    async () => {
    await Promise.all([
      db.routines.clear(),
      db.exercises.clear(),
      db.sessions.clear(),
      db.sets.clear(),
      db.bodyWeights.clear(),
      db.photos.clear(),
    ]);
    if (data.routines.length) await db.routines.bulkAdd(data.routines);
    if (data.exercises.length) await db.exercises.bulkAdd(data.exercises);
    if (data.sessions.length) await db.sessions.bulkAdd(data.sessions);
    if (data.sets.length) await db.sets.bulkAdd(data.sets);
    if (data.bodyWeights.length) await db.bodyWeights.bulkAdd(data.bodyWeights);
    if (data.photos.length) {
      await db.photos.bulkAdd(
        data.photos.map((p) => ({
          exerciseId: p.exerciseId,
          blob: dataUrlToBlob(p.dataUrl),
          updatedAt: p.updatedAt,
        }))
      );
    }
  });
}
