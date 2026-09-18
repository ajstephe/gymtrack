import { useThemeStore, type Theme } from '../store/themeStore';

// Dedicated hex values (not the shared button/accent tokens) so every category reads clearly as
// text/dot color against each theme's own background — a theme's bright "lime" button color in
// particular is often too light to use directly as text. One palette per theme, same 6 slots.
const PALETTES: Record<Theme, string[]> = {
  classic: [
    '#ff3d80', // crimson / hot pink
    '#1a8fb4', // azure / blue-teal
    '#7c9a1e', // lime, darkened for legibility as text
    '#c2540a', // amber, darkened toward burnt orange
    '#00897f', // primary teal
    '#7b2cbf', // primary-2 purple
  ],
  cupertino: [
    '#ff2d55', // pink
    '#007aff', // blue
    '#af52de', // purple
    '#ff9500', // orange
    '#248a3d', // green, darkened for legibility as text
    '#a2845e', // brown
  ],
  nordic: [
    '#c17a52', // terracotta
    '#6c839a', // dusk blue
    '#7f9575', // sage
    '#cf9f42', // mustard
    '#b8735f', // clay
    '#8b8578', // stone
  ],
};

/** Deterministic per-category color so e.g. "Chest" is always the same color everywhere. */
export function categoryColor(category: string): string {
  const palette = PALETTES[useThemeStore.getState().theme];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Color for one category among a known, fixed list — assigns by position instead of hashing, so
 * two categories shown side by side (e.g. stacked chart segments) never collide on the same
 * color the way two unrelated hashes occasionally do.
 */
export function categoryColorInSet(category: string, allCategories: string[]): string {
  const palette = PALETTES[useThemeStore.getState().theme];
  const index = allCategories.indexOf(category);
  return palette[index < 0 ? 0 : index % palette.length];
}
