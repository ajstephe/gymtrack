import { useState } from 'react';

const NEW_VALUE = '__new__';

export function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [creatingNew, setCreatingNew] = useState(false);

  if (creatingNew) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => {
            setCreatingNew(false);
            onChange(categories[0] ?? '');
          }}
          className="shrink-0 rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5 text-xs font-medium text-[var(--color-text-faint)]"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <select
      value={categories.includes(value) ? value : ''}
      onChange={(e) => {
        if (e.target.value === NEW_VALUE) {
          setCreatingNew(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
      className="w-full rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none"
    >
      <option value="" disabled>
        Select category
      </option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value={NEW_VALUE}>+ New category</option>
    </select>
  );
}
