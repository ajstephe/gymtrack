/** Every plate size a gym could plausibly stock, in kg — used both as the calculator's default
 * inventory and as the fixed reference for the rank-based color/height a plate renders at. */
export const ALL_PLATE_SIZES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Color by rank (biggest plate first) so it stays consistent regardless of which plates a given gym owns. */
const RANK_COLORS = [
  'var(--color-crimson)',
  'var(--color-primary)',
  'var(--color-amber)',
  'var(--color-azure)',
  'var(--color-lime)',
  'var(--color-primary-2)',
  'var(--color-text-faint)',
];

/** Height by rank (biggest plate first) — plates shrink visually as they get lighter. */
const RANK_HEIGHTS = [64, 58, 52, 46, 40, 34, 28];

export function plateColor(weight: number): string {
  const rank = ALL_PLATE_SIZES_KG.indexOf(weight);
  return RANK_COLORS[rank] ?? RANK_COLORS[RANK_COLORS.length - 1];
}

export function plateHeight(weight: number): number {
  const rank = ALL_PLATE_SIZES_KG.indexOf(weight);
  return RANK_HEIGHTS[rank] ?? RANK_HEIGHTS[RANK_HEIGHTS.length - 1];
}

/**
 * Greedy plate breakdown for one side, given the plates actually on hand (each size assumed to
 * be in unlimited supply — most gyms have several pairs of everything). `remainder` is left over
 * when the target can't be hit exactly with what's available.
 */
export function plateBreakdown(
  weightPerSide: number,
  availableSizes: number[] = ALL_PLATE_SIZES_KG
): { plates: number[]; remainder: number } {
  const sizes = [...availableSizes].sort((a, b) => b - a);
  let remaining = Math.max(0, Math.round(weightPerSide * 100) / 100);
  const plates: number[] = [];
  for (const size of sizes) {
    while (remaining - size >= -1e-6) {
      plates.push(size);
      remaining = Math.round((remaining - size) * 100) / 100;
    }
  }
  return { plates, remainder: remaining };
}
