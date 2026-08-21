import { Shirt, Shield, ArrowUpFromLine, Footprints, BicepsFlexed, HandFist, Grid3x3, Dumbbell, type LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  chest: Shirt,
  back: Shield,
  shoulders: ArrowUpFromLine,
  legs: Footprints,
  biceps: BicepsFlexed,
  triceps: HandFist,
  core: Grid3x3,
  abs: Grid3x3,
};

export function categoryIcon(category: string): LucideIcon {
  return ICON_MAP[category.trim().toLowerCase()] ?? Dumbbell;
}
