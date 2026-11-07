type Category = { id: string; name: string };
type Categorized = { category: Category; categories: Category[] };
export type Preference = { score: number; reason: string };

export function buildPreferences(interests: Category[], saved: Categorized[], past: Categorized[]) {
  const preferences = new Map<string, Preference>();
  const add = (category: Category, weight: number, reason: string) => {
    const previous = preferences.get(category.id);
    preferences.set(category.id, { score: (previous?.score ?? 0) + weight, reason: previous?.reason ?? reason });
  };
  for (const category of interests) add(category, 10, `Matches your interest in ${category.name}`);
  for (const event of saved) for (const category of event.categories.length ? event.categories : [event.category]) add(category, 3, `Similar to ${category.name} events you've saved`);
  for (const event of past) for (const category of event.categories.length ? event.categories : [event.category]) add(category, 1, `Based on your past ${category.name} registrations`);
  return preferences;
}

export function rankRecommendations<T extends Categorized & { id: string; date: Date }>(events: T[], preferences: Map<string, Preference>) {
  return events.map(event => {
    const matches = (event.categories.length ? event.categories : [event.category]).map(category => preferences.get(category.id)).filter((match): match is Preference => !!match).sort((a, b) => b.score - a.score);
    return { ...event, recommendationScore: matches.reduce((sum, match) => sum + match.score, 0), recommendationReason: matches[0]?.reason };
  }).sort((a, b) => b.recommendationScore - a.recommendationScore || a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));
}
