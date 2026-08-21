import type { WeightType, WeightUnit } from '../data/types';

export function formatWeight(weight: number, unit: WeightUnit): string {
  if (unit === 'bodyweight') return 'BW';
  if (unit === 'stack') return `#${trimNum(weight)}`;
  return `${trimNum(weight)}${unit}`;
}

export function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

export const weightTypeLabel: Record<Exclude<WeightType, null>, string> = {
  each: 'Per side',
  total: 'Total',
  bar: 'Fixed bar',
  each_bar: 'Per side + bar',
};

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}
