import { useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigationType, useNavigate } from 'react-router-dom';
import { ensureSeeded } from './data/db';
import { requestPersistentStorage } from './lib/storagePersistence';
import { TabBar } from './components/TabBar';
import { RestTimer } from './components/RestTimer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toast } from './components/Toast';
import { Spinner } from './components/Spinner';
import { StartWorkout } from './pages/StartWorkout';
import { ActiveWorkout } from './pages/ActiveWorkout';
import { History } from './pages/History';
import { Calendar } from './pages/Calendar';
import { SessionDetail } from './pages/SessionDetail';
import { ExerciseLibrary } from './pages/ExerciseLibrary';
import { PlateCalculator } from './pages/PlateCalculator';
import { Settings } from './pages/Settings';

// Dashboard and ExerciseDetail are the only two pages that pull in recharts — the single
// biggest thing in the main bundle. Splitting just these two keeps every other route's chunk
// (and the initial load, past the dashboard itself) free of it.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const ExerciseDetail = lazy(() => import('./pages/ExerciseDetail').then((m) => ({ default: m.ExerciseDetail })));

// Top-level tab-bar destinations. Anything else is a "push" (drill-in) route, which gets a
// directional slide transition and an edge-swipe-back gesture instead of the flat tab fade.
const TAB_ROUTES = new Set(['/', '/train', '/history', '/calendar', '/exercises', '/plates']);
const EDGE_ZONE_PX = 24;
const SWIPE_BACK_THRESHOLD_PX = 70;
const SWIPE_BACK_MAX_DRIFT_PX = 60;

function App() {
  const [ready, setReady] = useState(false);
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const showTabBar = !location.pathname.startsWith('/workout/');
  const isPushRoute = !TAB_ROUTES.has(location.pathname);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const transitionClass = useMemo(() => {
    if (navigationType === 'POP') return 'page-slide-in-left';
    if (navigationType === 'PUSH' && isPushRoute) return 'page-slide-in-right';
    return 'page-fade-in';
  }, [navigationType, isPushRoute]);

  useEffect(() => {
    ensureSeeded().then(() => setReady(true));
    requestPersistentStorage();
  }, []);

  // Edge-swipe-to-go-back: a discrete gesture (not a live drag-follow) — starting a touch within
  // the left edge zone and releasing well to the right pops the current push route.
  useEffect(() => {
    if (!isPushRoute) return;
    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      touchStart.current = t.clientX <= EDGE_ZONE_PX ? { x: t.clientX, y: t.clientY } : null;
    }
    function onTouchEnd(e: TouchEvent) {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (dx > SWIPE_BACK_THRESHOLD_PX && Math.abs(dy) < SWIPE_BACK_MAX_DRIFT_PX) {
        navigate(-1);
      }
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isPushRoute, navigate]);

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
        <div key={location.pathname} className={transitionClass}>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/train" element={<StartWorkout />} />
              <Route path="/workout/:sessionId" element={<ActiveWorkout />} />
              <Route path="/history" element={<History />} />
              <Route path="/history/:sessionId" element={<SessionDetail />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/exercises" element={<ExerciseLibrary />} />
              <Route path="/exercises/:exerciseId" element={<ExerciseDetail />} />
              <Route path="/plates" element={<PlateCalculator />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </div>
      </main>
      <RestTimer />
      {showTabBar && <TabBar />}
      <ConfirmDialog />
      <Toast />
    </>
  );
}

export default App;
