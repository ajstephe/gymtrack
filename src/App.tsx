import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ensureSeeded } from './data/db';
import { requestPersistentStorage } from './lib/storagePersistence';
import { TabBar } from './components/TabBar';
import { RestTimer } from './components/RestTimer';
import { Dashboard } from './pages/Dashboard';
import { StartWorkout } from './pages/StartWorkout';
import { ActiveWorkout } from './pages/ActiveWorkout';
import { History } from './pages/History';
import { Calendar } from './pages/Calendar';
import { SessionDetail } from './pages/SessionDetail';
import { ExerciseLibrary } from './pages/ExerciseLibrary';
import { ExerciseDetail } from './pages/ExerciseDetail';
import { Settings } from './pages/Settings';

function App() {
  const [ready, setReady] = useState(false);
  const location = useLocation();
  const showTabBar = !location.pathname.startsWith('/workout/');

  useEffect(() => {
    ensureSeeded().then(() => setReady(true));
    requestPersistentStorage();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <>
      <main className="safe-top flex-1 overflow-y-auto pb-6">
        <div key={location.pathname} className="page-fade-in">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/train" element={<StartWorkout />} />
            <Route path="/workout/:sessionId" element={<ActiveWorkout />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:sessionId" element={<SessionDetail />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route path="/exercises/:exerciseId" element={<ExerciseDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
      <RestTimer />
      {showTabBar && <TabBar />}
    </>
  );
}

export default App;
