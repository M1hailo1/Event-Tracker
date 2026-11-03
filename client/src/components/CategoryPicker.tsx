import { X } from "lucide-react";
import type { Category } from "../types";
import SearchableSelect from "./SearchableSelect";

export default function CategoryPicker({ categories, value, onChange, disabled }: {
  categories: Category[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  return <fieldset disabled={disabled} className="min-w-0 space-y-3">
    <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">Categories</legend>
    <p className="text-sm text-gray-500 dark:text-gray-400">Choose up to 3. Your main category appears first on the event card.</p>
    {value.length > 0 && <ul className="flex flex-wrap gap-2" aria-label="Selected categories">
      {value.map((id, index) => {
        const name = categories.find(category => category.id === id)?.name ?? "Loading…";
        return <li key={id} className="flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
          <span>{name}</span>
          {index === 0 ? <span className="text-xs font-semibold">Main</span> : <button type="button" disabled={disabled}
            aria-label={`Make ${name} main`} onClick={() => onChange([id, ...value.filter(item => item !== id)])}
            className="rounded text-xs underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-500">Make main</button>}
          <button type="button" disabled={disabled} aria-label={`Remove ${name}`} onClick={() => onChange(value.filter(item => item !== id))}
            className="rounded p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900 focus-visible:outline-2 focus-visible:outline-indigo-500"><X size={14} aria-hidden="true" /></button>
        </li>;
      })}
    </ul>}
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 sm:max-w-sm">
        <SearchableSelect label="Add a category" hideLabel value="" placeholder={value.length === 3 ? "3 categories selected" : "Add a category…"}
          disabled={disabled || value.length >= 3 || categories.length === 0}
          options={categories.filter(category => !value.includes(category.id)).map(category => ({ value: category.id, label: category.name }))}
          onChange={id => { if (!value.includes(id) && value.length < 3) onChange([...value, id]); }} />
      </div>
      <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">{value.length}/3</span>
    </div>
  </fieldset>;
}
