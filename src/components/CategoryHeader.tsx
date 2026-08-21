import { categoryColor } from '../lib/categoryColors';
import { categoryIcon } from '../lib/categoryIcons';

export function CategoryHeader({ category }: { category: string }) {
  const color = categoryColor(category);
  const Icon = categoryIcon(category);
  return (
    <div className="mb-2.5 flex items-center gap-2 px-1">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ background: `${color}22` }}
      >
        <Icon size={13} style={{ color }} strokeWidth={2.4} />
      </span>
      <h2 className="text-sm font-extrabold tracking-wide" style={{ color }}>
        {category.toUpperCase()}
      </h2>
      <span className="h-px flex-1" style={{ background: `${color}33` }} />
    </div>
  );
}
