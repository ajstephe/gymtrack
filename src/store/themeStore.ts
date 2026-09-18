import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const THEMES = ['classic', 'neon80s', 'cupertino', 'nordic'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_META: Record<Theme, { label: string; swatch: [string, string, string]; themeColor: string }> = {
  classic: { label: 'Classic', swatch: ['#f2ecd8', '#00897f', '#ff3d80'], themeColor: '#f2ecd8' },
  neon80s: { label: 'Neon ’80s', swatch: ['#12071f', '#ff2e9d', '#00e5ff'], themeColor: '#12071f' },
  cupertino: { label: 'Cupertino', swatch: ['#000000', '#0a84ff', '#ff453a'], themeColor: '#000000' },
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
    { name: 'gym-tracker-theme' }
  )
);
