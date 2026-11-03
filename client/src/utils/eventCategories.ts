import type { Event } from "../types";

export function getEventCategories(event: Pick<Event, "categoryId" | "category" | "categories">) {
  const categories = event.categories?.length ? [...event.categories] : event.category ? [event.category] : [];
  return categories.sort((a, b) => a.id === event.categoryId ? -1 : b.id === event.categoryId ? 1 : a.name.localeCompare(b.name));
}
