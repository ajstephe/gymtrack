import { NavLink, useLocation } from 'react-router-dom';
import { hapticTap } from '../lib/haptics';
import { navTabs as tabs } from '../lib/navTabs';

/** The TabBar's wide-screen counterpart — a persistent left rail instead of a bottom bar, shown
 * only at the md breakpoint and up (TabBar hides itself there). Same destinations, same active-tab
 * logic, just oriented for the extra width an unfolded/tablet-size screen has to spend. */
export function SideNav() {
  const location = useLocation();
  const activeIndex = tabs.findIndex((t) =>
    t.end ? location.pathname === t.to : location.pathname.startsWith(t.to)
  );

  return (
    <nav className="sticky top-0 hidden h-dvh w-[196px] shrink-0 flex-col gap-1 overflow-y-auto border-r-[3px] border-[var(--color-border)] bg-[var(--color-bg)] px-3 pt-[calc(env(safe-area-inset-top)+20px)] pb-4 md:flex">
      <div className="mb-3 px-2 text-lg font-bold">
        Gym<span className="accent-text">Tracker</span>
      </div>
      {tabs.map(({ to, label, icon: Icon, end }, i) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => {
            if (i !== activeIndex) hapticTap();
          }}
          className={({ isActive }) =>
            `font-display flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all active:scale-[0.97] ${
              isActive
                ? 'border-2 border-[var(--color-border)] bg-[var(--color-lime)] text-[var(--color-text)]'
                : 'border-2 border-transparent text-[var(--color-text-faint)]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} className="shrink-0" />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
