import type { WeightUnit } from '../data/types';

export const UNIT_OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
  { value: 'stack', label: 'Machine stack #' },
  { value: 'bodyweight', label: 'Bodyweight' },
];
