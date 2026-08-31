import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';

/**
 * Object URLs are created synchronously during render (derived from `photo`, not stored via
 * setState) so there's no extra render pass. The effect exists only to revoke the previous URL
 * when it's replaced or the component unmounts — it never calls setState.
 */
export function useExercisePhotoUrl(exerciseId: string): string | null {
  const photo = useLiveQuery(() => db.photos.get(exerciseId), [exerciseId]);
  const url = useMemo(() => (photo ? URL.createObjectURL(photo.blob) : null), [photo]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return url;
}
