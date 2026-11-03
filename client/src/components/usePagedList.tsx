import { useCallback, useEffect, useRef, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import type { PageResult } from "./Pagination";

// Keep counts separate from the loaded slice, and ignore responses for an old list.
export function usePagedList<T extends { id: string }>(url: string) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const inFlight = useRef(false);

  const load = useCallback(async (nextPage: number, replace: boolean, version: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await axiosInstance.get<PageResult<T>>(url, {
        params: { page: nextPage, pageSize: 20 },
      });
      if (version !== generation.current) return;
      setItems(previous => replace ? data.items :
        [...new Map([...previous, ...data.items].map(item => [item.id, item])).values()]);
      setTotal(data.total);
      setPage(data.page);
      setHasMore(data.page < data.totalPages);
    } catch {
      if (version === generation.current) setError("Unable to load this list.");
    } finally {
      if (version === generation.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }, [url]);

  useEffect(() => {
    const version = ++generation.current;
    inFlight.current = false;
    setItems([]);
    setTotal(0);
    setPage(0);
    setHasMore(false);
    void load(1, true, version);
    return () => { generation.current++; };
  }, [load]);

  function loadMore() {
    void load(page + 1, page === 0, generation.current);
  }

  return { items, total, hasMore, busy, error, loadMore };
}

export function ListMore({ busy, error, hasMore, onMore }: {
  busy: boolean;
  error: string;
  hasMore: boolean;
  onMore: () => void;
}) {
  return <>
    {busy && <p role="status" className="mt-2 text-sm text-gray-500">Loading?</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    {(hasMore || error) && (
      <button type="button" disabled={busy} onClick={onMore}
        className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 disabled:opacity-50">
        {error ? "Try again" : "Load more"}
      </button>
    )}
  </>;
}
