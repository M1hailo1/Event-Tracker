export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function Pagination({ page, totalPages, onChange, disabled = false }: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, ...Array.from({ length: 5 }, (_, i) => page - 2 + i), totalPages])]
    .filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const style = "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 dark:border-gray-600 disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="my-5 flex flex-wrap items-center justify-center gap-2">
      <button className={style} disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p > pages[i - 1] + 1 && <span aria-hidden="true">?</span>}
          <button className={`${style} ${p === page ? "bg-indigo-600 !text-white" : ""}`}
            aria-current={p === page ? "page" : undefined} disabled={disabled} onClick={() => onChange(p)}>
            {p}
          </button>
        </span>
      ))}
      <button className={style} disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}
