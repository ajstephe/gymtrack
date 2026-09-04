import type { BarType, WeightUnit } from '../data/types';

const PLATE_SETS: Record<'kg' | 'lb', number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

export const BAR_TYPES: BarType[] = ['standard', 'short', 'ez'];

export const BAR_LABEL: Record<BarType, string> = {
  standard: 'Standard',
  short: 'Short',
  ez: 'EZ',
};

/** Bar weight by type, used when a "per side + bar" exercise needs a total load. */
export const BAR_WEIGHT: Record<BarType, Record<'kg' | 'lb', number>> = {
  standard: { kg: 20, lb: 45 },
  short: { kg: 15, lb: 33 },
  ez: { kg: 7.5, lb: 18 },
};

/** Color by rank (biggest plate first) rather than by literal weight, so it stays consistent across kg and lb sets. */
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

export function plateColor(weight: number, unit: 'kg' | 'lb'): string {
  const rank = PLATE_SETS[unit].indexOf(weight);
  return RANK_COLORS[rank] ?? RANK_COLORS[RANK_COLORS.length - 1];
}

export function plateHeight(weight: number, unit: 'kg' | 'lb'): number {
  const rank = PLATE_SETS[unit].indexOf(weight);
  return RANK_HEIGHTS[rank] ?? RANK_HEIGHTS[RANK_HEIGHTS.length - 1];
}

/** Plate math only makes sense for a real barbell/plate-loaded weight in kg or lb. */
export function canPlateCalc(unit: WeightUnit): unit is 'kg' | 'lb' {
  return unit === 'kg' || unit === 'lb';
}

/**
 * Greedy plate breakdown for one side, assuming an unlimited supply of each standard plate.
 * `remainder` is left over when the target can't be hit exactly with the plates on hand
 * (e.g. a smallest-plate step finer than 1.25kg/2.5lb).
 */
export function plateBreakdown(weightPerSide: number, unit: 'kg' | 'lb'): { plates: number[]; remainder: number } {
  const sizes = PLATE_SETS[unit];
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
