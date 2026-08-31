import type { WeightUnit } from '../data/types';

const PLATE_SETS: Record<'kg' | 'lb', number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

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
