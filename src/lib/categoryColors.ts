// Dedicated hex values (not the shared button/accent tokens) so every category
// reads clearly as text/dot color against the light poster-paper background —
// the bright button-lime in particular is too light to use directly as text.
const PALETTE = [
  '#ff3d80', // crimson / hot pink
  '#1a8fb4', // azure / blue-teal
  '#7c9a1e', // lime, darkened for legibility as text
  '#c2540a', // amber, darkened toward burnt orange
  '#00897f', // primary teal
  '#7b2cbf', // primary-2 purple
];

/** Deterministic per-category color so e.g. "Chest" is always the same color everywhere. */
export function categoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * Color for one category among a known, fixed list — assigns by position instead of hashing, so
 * two categories shown side by side (e.g. stacked chart segments) never collide on the same
 * color the way two unrelated hashes occasionally do.
 */
export function categoryColorInSet(category: string, allCategories: string[]): string {
  const index = allCategories.indexOf(category);
  return PALETTE[index < 0 ? 0 : index % PALETTE.length];
}
