import { useCallback, useEffect, useRef, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import type { PageResult } from "./Pagination";

interface ListState<T> {
  url: string;
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
  busy: boolean;
  error: string;
}
const emptyList = <T,>(url: string): ListState<T> => ({ url, items: [], total: 0, page: 0, hasMore: false, busy: true, error: "" });

export function usePagedList<T extends { id: string }>(url: string) {
  const [state, setState] = useState<ListState<T>>(() => emptyList<T>(url));
  const current = state.url === url ? state : emptyList<T>(url);
  const generation = useRef(0);
  const inFlight = useRef(false);

  const load = useCallback((nextPage: number, replace: boolean, version: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    return axiosInstance.get<PageResult<T>>(url, { params: { page: nextPage, pageSize: 20 } }).then(({ data }) => {
      if (version !== generation.current) return;
      setState(previous => ({
        url,
        items: replace ? data.items : [...new Map([...(previous.url === url ? previous.items : []), ...data.items].map(item => [item.id, item])).values()],
        total: data.total, page: data.page, hasMore: data.page < data.totalPages, busy: false, error: "",
      }));
    }).catch(() => {
      if (version === generation.current) setState(previous => ({ ...(previous.url === url ? previous : emptyList<T>(url)), busy: false, error: "Unable to load this list." }));
    }).finally(() => {
      if (version === generation.current) inFlight.current = false;
    });
  }, [url]);

  useEffect(() => {
    const version = ++generation.current;
    inFlight.current = false;
    void load(1, true, version);
    return () => { generation.current = version + 1; };
  }, [load]);

  function loadMore() {
    if (inFlight.current) return;
    setState({ ...current, busy: true, error: "" });
    void load(current.page + 1, current.page === 0, generation.current);
  }

  return { items: current.items, total: current.total, hasMore: current.hasMore, busy: current.busy, error: current.error, loadMore };
}
