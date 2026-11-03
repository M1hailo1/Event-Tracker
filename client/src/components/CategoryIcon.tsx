import { useId, useState } from "react";
import { Music, Palette, Clapperboard, Gamepad2, PartyPopper, Trophy, HeartPulse, Mountain,
  GraduationCap, Hammer, Cpu, BriefcaseBusiness, Users, Utensils, HandHeart, Cake, Baby, Shapes } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  Music, "Arts & Culture": Palette, Film: Clapperboard, Gaming: Gamepad2,
  Nightlife: PartyPopper, Sports: Trophy, "Fitness & Wellness": HeartPulse,
  "Outdoors & Adventure": Mountain, Education: GraduationCap, "Workshops & DIY": Hammer,
  Technology: Cpu, "Business & Networking": BriefcaseBusiness, "Social & Meetups": Users,
  "Food & Drink": Utensils, "Community & Volunteering": HandHeart,
  "Birthdays & Celebrations": Cake, "Family & Kids": Baby, Other: Shapes,
};

export default function CategoryIcon({ name }: { name: string }) {
  const Icon = icons[name] ?? Shapes;
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  return <span role="img" aria-label={name} tabIndex={0}
    onPointerEnter={event => { if (event.pointerType !== "touch") setOpen(true); }}
    onPointerLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
    onPointerDown={event => { if (event.pointerType === "touch") setOpen(true); }}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); } }}
    className="relative flex size-7 shrink-0 cursor-help items-center justify-center rounded-full border border-indigo-200 bg-white/95 text-indigo-600 shadow-sm dark:border-indigo-800 dark:bg-gray-900/95 dark:text-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800">
    <Icon size={16} aria-hidden="true" strokeWidth={1.8} />
    {open && <span id={tooltipId} role="tooltip" className="absolute right-0 top-full z-20 pt-2">
      <span className="block w-max max-w-56 rounded-lg bg-gray-900 px-3 py-2 text-center text-xs font-medium text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">{name}</span>
    </span>}
  </span>;
}
