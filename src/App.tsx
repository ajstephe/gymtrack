import { useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigationType, useNavigate } from 'react-router-dom';
import { ListTree, History as HistoryIcon } from 'lucide-react';
import { ensureSeeded } from './data/db';
import { requestPersistentStorage } from './lib/storagePersistence';
import { useThemeStore, THEME_META } from './store/themeStore';
import { useMediaQuery } from './lib/useMediaQuery';
import { TabBar } from './components/TabBar';
import { SideNav } from './components/SideNav';
import { SplitPane } from './components/SplitPane';
import { EmptyState } from './components/EmptyState';
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
const TAB_ROUTES = new Set(['/', '/train', '/history', '/calendar', '/exercises', '/plates', '/settings']);
// Routes with a nested `:id` detail page, shown side by side via SplitPane on wide screens.
const SPLIT_ROUTES = ['/exercises', '/history'];
const EDGE_ZONE_PX = 24;
const SWIPE_BACK_THRESHOLD_PX = 70;
const SWIPE_BACK_MAX_DRIFT_PX = 60;

function App() {
  const [ready, setReady] = useState(false);
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const isPushRoute = !TAB_ROUTES.has(location.pathname);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const isWide = useMediaQuery('(min-width: 768px)');

  // On wide screens, a SplitPane route's list pane must survive index <-> detail navigation
  // (no remount, no lost scroll position), so the transition wrapper keys on just the route's
  // section prefix there instead of the full pathname. Narrow screens keep the exact prior
  // behavior: a full-pathname key and a slide transition on every navigation.
  const splitPrefix = SPLIT_ROUTES.find(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`)
  );
  const transitionKey = isWide && splitPrefix ? splitPrefix : location.pathname;

  // Reflects the chosen theme onto the document so index.css's [data-theme] token blocks apply,
  // and keeps the browser/OS chrome (status bar, task switcher) in sync via meta theme-color.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_META[theme].themeColor);
  }, [theme]);

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
      <SideNav />
      <div className="flex min-h-0 flex-1 flex-col">
        <main className="safe-top flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
          <div key={transitionKey} className={`flex min-h-0 flex-1 flex-col ${transitionClass}`}>
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/train" element={<StartWorkout />} />
                <Route path="/workout/:sessionId" element={<ActiveWorkout />} />
                <Route
                  path="/history"
                  element={
                    <SplitPane
                      list={<History />}
                      placeholder={
                        <EmptyState icon={<HistoryIcon size={28} />} title="No workout selected" sub="Pick a session from the list." />
                      }
                    />
                  }
                >
                  <Route path=":sessionId" element={<SessionDetail />} />
                </Route>
                <Route path="/calendar" element={<Calendar />} />
                <Route
                  path="/exercises"
                  element={
                    <SplitPane
                      list={<ExerciseLibrary />}
                      placeholder={
                        <EmptyState icon={<ListTree size={28} />} title="No exercise selected" sub="Pick an exercise from the list." />
                      }
                    />
                  }
                >
                  <Route path=":exerciseId" element={<ExerciseDetail />} />
                </Route>
                <Route path="/plates" element={<PlateCalculator />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>
          </div>
        </main>
        <TabBar />
      </div>
      <ConfirmDialog />
      <Toast />
    </>
  );
}

export default App;
