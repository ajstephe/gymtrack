import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { WorkoutCalendar } from '../components/WorkoutCalendar';

export function Calendar() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const routines = useLiveQuery(() => db.routines.toArray(), []) ?? [];
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];
  const sets = useLiveQuery(() => db.sets.toArray(), []) ?? [];

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-5 text-2xl font-bold">Calendar</h1>
      <WorkoutCalendar sessions={sessions} sets={sets} exercises={exercises} routines={routines} />
    </div>
  );
}
