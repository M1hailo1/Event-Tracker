import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

interface Option { value: string; label: string; }
interface Props {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}

export default function SearchableSelect({ label, options, value, onChange, placeholder = "Choose a category", disabled = false, hideLabel = false }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, height: 300, above: false });
  const filtered = options.filter(option => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selected = options.find(option => option.value === value);
  const expanded = open && !disabled;

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  }

  function measure() {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const flip = below < 240 && above > below;
    const height = Math.min(300, Math.max(100, flip ? above : below));
    const width = Math.min(Math.max(rect.width, 260), window.innerWidth - 24);
    const next = { left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: flip ? rect.top - 6 : rect.bottom + 6, width, height, above: flip };
    setPosition(previous => Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
  }

  function show() {
    if (disabled) return;
    measure();
    setQuery("");
    setActive(Math.max(0, options.findIndex(option => option.value === value)));
    setOpen(true);
  }

  function choose(option: Option) {
    onChange(option.value);
    close(true);
  }

  useEffect(() => {
    if (!expanded) return;
    search.current?.focus({ preventScroll: true });
    function outside(event: PointerEvent) {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    }
    function reposition(event: Event) {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      measure();
    }
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [expanded]);

  useEffect(() => {
    if (expanded) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, query, expanded, id]);

  return <div className="min-w-0">
    {!hideLabel && <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</span>}
    <button ref={trigger} type="button" disabled={disabled} aria-label={`${label}: ${selected?.label ?? placeholder}`}
      aria-haspopup="listbox" aria-expanded={expanded} aria-controls={expanded ? `${id}-list` : undefined}
      onClick={() => expanded ? close() : show()}
      onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); show(); } }}
      className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
      <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
      <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-gray-400" />
    </button>
    {expanded && createPortal(<div ref={panel} style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.height, transform: position.above ? "translateY(-100%)" : undefined }}
      className="fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2.5 dark:border-gray-700">
        <Search size={16} aria-hidden="true" className="shrink-0 text-gray-400" />
        <input ref={search} type="text" role="combobox" aria-label={`Search ${label.toLowerCase()}`} autoComplete="off"
          aria-expanded="true" aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={filtered[active] ? `${id}-option-${active}` : undefined}
          value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} placeholder="Type to find a category…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          onKeyDown={event => {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); }
            else if (event.key === "Tab") { close(true); }
            else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setActive(current => filtered.length ? (current + (event.key === "ArrowDown" ? 1 : -1) + filtered.length) % filtered.length : 0);
            } else if (event.key === "Enter") { event.preventDefault(); if (filtered[active]) choose(filtered[active]); }
          }} />
      </div>
      <ul id={`${id}-list`} role="listbox" aria-label={label} style={{ maxHeight: position.height - 48 }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {filtered.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={option.value === value}
          onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}
          className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${active === index ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200" : "text-gray-700 dark:text-gray-200"}`}>
          <span>{option.label}</span>{option.value === value && <Check size={16} aria-hidden="true" className="shrink-0 text-indigo-500" />}
        </li>)}
      </ul>
      {filtered.length === 0 && <p role="status" className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No matching categories.</p>}
    </div>, document.body)}
  </div>;
}
