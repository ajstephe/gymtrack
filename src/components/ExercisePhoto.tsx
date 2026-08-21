import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Trash2 } from 'lucide-react';
import { db } from '../data/db';
import { PhotoViewer } from './PhotoViewer';

export function useExercisePhotoUrl(exerciseId: string): string | null {
  const photo = useLiveQuery(() => db.photos.get(exerciseId), [exerciseId]);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(photo.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  return url;
}

export function ExercisePhotoThumb({ exerciseId, size = 40 }: { exerciseId: string; size?: number }) {
  const url = useExercisePhotoUrl(exerciseId);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      className="shrink-0 rounded-lg object-cover"
      style={{ width: size, height: size }}
    />
  );
}

async function savePhoto(exerciseId: string, file: File) {
  await db.photos.put({ exerciseId, blob: file, updatedAt: new Date().toISOString() });
}

/** Compact capture control: shows a thumbnail if present, tapping opens the camera/file picker. */
export function ExercisePhotoButton({ exerciseId, size = 44 }: { exerciseId: string; size?: number }) {
  const url = useExercisePhotoUrl(exerciseId);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]"
        style={{ width: size, height: size }}
        aria-label={url ? 'Retake photo' : 'Add photo'}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[var(--color-text-faint)]">
            <Camera size={18} />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) savePhoto(exerciseId, file);
          e.target.value = '';
        }}
      />
    </>
  );
}

/** Full photo card for the exercise detail page: large preview + take/retake/remove. */
export function ExercisePhotoCard({ exerciseId }: { exerciseId: string }) {
  const url = useExercisePhotoUrl(exerciseId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showViewer, setShowViewer] = useState(false);

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      {url ? (
        <button type="button" onClick={() => setShowViewer(true)} className="block w-full" aria-label="View photo">
          <img src={url} alt="" className="h-48 w-full object-cover" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-32 w-full flex-col items-center justify-center gap-1.5 text-[var(--color-text-faint)]"
        >
          <Camera size={22} />
          <span className="text-sm">Add a photo of the machine</span>
        </button>
      )}
      {url && (
        <div className="flex gap-2 border-t border-[var(--color-border)] p-2.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] py-2 text-sm font-medium"
          >
            <Camera size={15} /> Retake
          </button>
          <button
            type="button"
            onClick={() => db.photos.delete(exerciseId)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-sm font-medium text-[var(--color-danger)]"
            aria-label="Remove photo"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) savePhoto(exerciseId, file);
          e.target.value = '';
        }}
      />
      {showViewer && url && <PhotoViewer src={url} onClose={() => setShowViewer(false)} />}
    </div>
  );
}
