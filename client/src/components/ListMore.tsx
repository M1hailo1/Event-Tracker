export function ListMore({ busy, error, hasMore, onMore }: {
  busy: boolean;
  error: string;
  hasMore: boolean;
  onMore: () => void;
}) {
  return <>
    {busy && <p role="status" className="mt-2 text-sm text-gray-500">Loading...</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    {(hasMore || error) && (
      <button type="button" disabled={busy} onClick={onMore}
        className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 disabled:opacity-50">
        {error ? "Try again" : "Load more"}
      </button>
    )}
  </>;
}
