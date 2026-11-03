import { useState } from "react";
import { Check } from "lucide-react";
import { eventCovers, eventCoverUrl } from "../data/eventCovers";
import EventCover from "./EventCover";
import SearchableSelect from "./SearchableSelect";

const groups = ["All", ...[...new Set(eventCovers.map(cover => cover.group))].sort((a, b) => a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b))];

export default function EventCoverPicker({ value, onChange, disabled }: {
  value: string | null;
  onChange: (id: string | null) => void;
  disabled: boolean;
}) {
  const [group, setGroup] = useState("All");
  const [expanded, setExpanded] = useState(false);
  const selected = eventCovers.find(cover => cover.id === value);
  return <fieldset disabled={disabled} className="min-w-0 space-y-3">
    <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">Event cover (optional)</legend>
    <p className="text-sm text-gray-500 dark:text-gray-400">Give your event a little personality. Choose an illustration from our collection.</p>
    {selected && <div className="max-w-lg overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <EventCover coverId={value} eager />
      <p className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{selected.label}</p>
    </div>}
    <div className="flex flex-wrap gap-3">
      <button type="button" aria-expanded={expanded} aria-controls="event-cover-options" onClick={() => setExpanded(!expanded)}
        className="rounded-lg border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-300 focus-visible:outline-2 focus-visible:outline-indigo-500">
        {expanded ? "Close collection" : selected ? "Change cover" : "Choose a cover"}
      </button>
      {selected && <button type="button" onClick={() => onChange(null)} className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 focus-visible:outline-2 focus-visible:outline-indigo-500">Remove cover</button>}
    </div>
    {expanded && <div id="event-cover-options" className="space-y-3">
      <div className="max-w-sm">
        <SearchableSelect label="Browse covers" value={group} onChange={setGroup} disabled={disabled}
          options={groups.map(item => ({ value: item, label: item === "All" ? "All covers" : item }))} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1" aria-label="Cover illustrations">
        {eventCovers.filter(cover => group === "All" || cover.group === group).map(cover => <button
          key={cover.id} type="button" aria-pressed={value === cover.id} onClick={() => onChange(cover.id)}
          className={`relative overflow-hidden rounded-lg border-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${value === cover.id ? "border-indigo-500" : "border-gray-200 dark:border-gray-600 hover:border-indigo-300"}`}>
          <img src={eventCoverUrl(cover.id)} alt="" loading="lazy" decoding="async" width={320} height={160} className="aspect-[2/1] w-full object-cover" />
          <span className="block px-2 py-2 text-xs text-gray-700 dark:text-gray-200">{cover.label}</span>
          {value === cover.id && <span className="absolute top-1 right-1 rounded-full bg-indigo-600 p-1 text-white"><Check size={14} aria-hidden="true" /></span>}
        </button>)}
      </div>
    </div>}
  </fieldset>;
}
