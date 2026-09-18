import { Check } from 'lucide-react';
import { THEMES, THEME_META, useThemeStore } from '../store/themeStore';
import { hapticTap } from '../lib/haptics';

export function ThemeSwitcher() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="mb-4 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-dim)]">Theme</h2>
      <div className="grid grid-cols-2 gap-2">
        {THEMES.map((t) => {
          const meta = THEME_META[t];
          const active = t === theme;
          return (
            <button
              key={t}
              onClick={() => {
                if (t !== theme) hapticTap();
                setTheme(t);
              }}
              className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition active:scale-[0.97] ${
                active
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-2)]'
              }`}
            >
              <span className="flex shrink-0 -space-x-1.5">
                {meta.swatch.map((hex, i) => (
                  <span
                    key={i}
                    className="h-5 w-5 rounded-full border-2 border-[var(--color-surface)]"
                    style={{ background: hex }}
                  />
                ))}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{meta.label}</span>
              {active && <Check size={15} strokeWidth={3} className="shrink-0 text-[var(--color-primary)]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
