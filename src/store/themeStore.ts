import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const THEMES = ['classic', 'cupertino', 'nordic'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_META: Record<Theme, { label: string; swatch: [string, string, string]; themeColor: string }> = {
  classic: { label: 'Classic', swatch: ['#f2ecd8', '#00897f', '#ff3d80'], themeColor: '#f2ecd8' },
  cupertino: { label: 'Cupertino', swatch: ['#f2f2f7', '#007aff', '#ff3b30'], themeColor: '#f2f2f7' },
  nordic: { label: 'Nordic', swatch: ['#f6f3ec', '#c17a52', '#7f9575'], themeColor: '#f6f3ec' },
};

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'classic',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'gym-tracker-theme',
      // A theme retired since a user last picked it (e.g. the old Neon '80s) would otherwise
      // stick around as an unrecognized value with no matching CSS and no active swatch shown.
      merge: (persisted, current) => {
        const theme = (persisted as Partial<ThemeState> | undefined)?.theme;
        return { ...current, theme: theme && (THEMES as readonly string[]).includes(theme) ? theme : current.theme };
      },
    }
  )
);
