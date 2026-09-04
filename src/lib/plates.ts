export type PlateUnit = 'kg' | 'lb';

/** Every plate size a gym could plausibly stock, per unit — used both as the calculator's default
 * inventory and as the fixed reference for the rank-based color/height a plate renders at. */
export const ALL_PLATE_SIZES: Record<PlateUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

/** Standard and short bar weights, per unit — the calculator's two fixed presets (plus a custom option). */
export const BAR_PRESETS: Record<PlateUnit, { standard: number; short: number }> = {
  kg: { standard: 20, short: 15 },
  lb: { standard: 45, short: 33 },
};

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

export function plateColor(weight: number, unit: PlateUnit): string {
  const rank = ALL_PLATE_SIZES[unit].indexOf(weight);
  return RANK_COLORS[rank] ?? RANK_COLORS[RANK_COLORS.length - 1];
}

export function plateHeight(weight: number, unit: PlateUnit): number {
  const rank = ALL_PLATE_SIZES[unit].indexOf(weight);
  return RANK_HEIGHTS[rank] ?? RANK_HEIGHTS[RANK_HEIGHTS.length - 1];
}

/**
 * Greedy plate breakdown for one side, given the plates actually on hand (each size assumed to
 * be in unlimited supply — most gyms have several pairs of everything). `remainder` is left over
 * when the target can't be hit exactly with what's available.
 */
export function plateBreakdown(
  weightPerSide: number,
  unit: PlateUnit,
  availableSizes?: number[]
): { plates: number[]; remainder: number } {
  const sizes = [...(availableSizes ?? ALL_PLATE_SIZES[unit])].sort((a, b) => b - a);
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
