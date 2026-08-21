import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, History, ListTree } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/train', label: 'Train', icon: Dumbbell, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
  { to: '/exercises', label: 'Exercises', icon: ListTree, end: false },
];

export function TabBar() {
  return (
    <nav className="sticky bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around px-2 pt-1.5">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-faint)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? 'text-[var(--color-primary)]' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
