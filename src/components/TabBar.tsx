import { NavLink, useLocation } from 'react-router-dom';
import { Home, Dumbbell, History, CalendarDays, ListTree } from 'lucide-react';
import { hapticTap } from '../lib/haptics';

const tabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/train', label: 'Train', icon: Dumbbell, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, end: false },
  { to: '/exercises', label: 'Exercises', icon: ListTree, end: false },
];

export function TabBar() {
  const location = useLocation();
  const activeIndex = tabs.findIndex((t) =>
    t.end ? location.pathname === t.to : location.pathname.startsWith(t.to)
  );

  return (
    <nav className="sticky bottom-0 z-30 border-t-[3px] border-[var(--color-border)] bg-[var(--color-bg)] px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex items-stretch justify-around pt-1.5">
        {activeIndex >= 0 && (
          <div
            aria-hidden="true"
            className="absolute inset-y-1.5 left-0 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-lime)] transition-transform duration-300 ease-out"
            style={{
              width: `${100 / tabs.length}%`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
        )}
        {tabs.map(({ to, label, icon: Icon, end }, i) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => {
              if (i !== activeIndex) hapticTap();
            }}
            className={({ isActive }) =>
              `font-display relative z-10 flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] transition-all active:scale-90 ${
                isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-faint)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={`transition-colors ${isActive ? 'text-[var(--color-text)]' : ''}`}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
