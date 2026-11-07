import { useEffect, useRef, useState } from "react";
import { getAllCategories } from "../api/categoriesApi";
import axiosInstance from "../api/axiosInstance";
import type { Category } from "../types";
import { Check, Sparkles } from "lucide-react";

export default function InterestSelection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    Promise.all([getAllCategories(), axiosInstance.get<Category[]>("/users/me/interests")]).then(([options, response]) => {
      if (active) { setCategories(options); setSelected(response.data.map(category => category.id)); setError(""); }
    }).catch(() => { if (active) setError("Couldn't load your interests. Please retry."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  async function save() {
    if (pending.current) return;
    pending.current = true;
    setSaving(true); setError(""); setMessage("");
    try {
      await axiosInstance.put("/users/me/interests", { categoryIds: selected });
      setMessage("Interests saved.");
    } catch { setError("Couldn't save your interests. Your choices are still here; please retry."); }
    finally { pending.current = false; setSaving(false); }
  }
  return <section className="mb-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
    <div className="mb-2 flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Sparkles size={20} aria-hidden="true" /></span><div><h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Your interests</h2><p className="text-sm text-gray-500 dark:text-gray-400">A little more you. Discover events you'll enjoy.</p></div></div>
    <p className="mb-5 mt-3 text-sm text-gray-500 dark:text-gray-400">Pick your favorite categories to personalize recommendations. Your choices are private.</p>
    {loading ? <p role="status">Loading interests…</p> : categories.length > 0 ? <>
      <fieldset disabled={saving} className="flex flex-wrap gap-2.5"><legend className="sr-only">Event interests</legend>{categories.map(category => {
        const checked = selected.includes(category.id);
        return <label key={category.id} className={`relative inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-indigo-500 has-focus-visible:ring-offset-2 dark:has-focus-visible:ring-offset-gray-800 ${saving ? "cursor-wait opacity-60" : ""} ${checked ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/15 dark:text-indigo-200" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:border-indigo-500"}`}><input className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait" type="checkbox" checked={checked} onChange={event => { setSelected(previous => event.target.checked ? [...previous, category.id] : previous.filter(id => id !== category.id)); setMessage(""); }} /><span aria-hidden="true" className={`flex size-4 shrink-0 items-center justify-center rounded-full ${checked ? "bg-indigo-600 text-white dark:bg-indigo-400 dark:text-gray-900" : "border border-gray-300 dark:border-gray-500"}`}>{checked && <Check size={12} strokeWidth={3} />}</span>{category.name}</label>;
      })}</fieldset>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-700"><p className="text-sm text-gray-500 dark:text-gray-400">{selected.length ? `${selected.length} selected` : "Choose what interests you"}</p><button type="button" disabled={saving} onClick={save} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50">{saving ? "Saving…" : "Save interests"}</button></div>
    </> : <button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }} className="text-indigo-600 dark:text-indigo-400">Retry loading interests</button>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-green-700 dark:text-green-400">{message}</p>}
  </section>;
}
