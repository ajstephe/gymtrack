import { categoryColor } from '../lib/categoryColors';

export function CategoryHeader({ category }: { category: string }) {
  const color = categoryColor(category);
  return (
    <div className="mb-2.5 flex items-center gap-2 px-1">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <h2 className="text-sm font-extrabold tracking-wide" style={{ color }}>
        {category.toUpperCase()}
      </h2>
      <span className="h-px flex-1" style={{ background: `${color}33` }} />
    </div>
  );
}
