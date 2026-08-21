const PALETTE = [
  'var(--color-crimson)',
  'var(--color-azure)',
  'var(--color-lime)',
  'var(--color-amber)',
  'var(--color-primary)',
  'var(--color-primary-2)',
];

/** Deterministic per-category color so e.g. "Chest" is always the same color everywhere. */
export function categoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
