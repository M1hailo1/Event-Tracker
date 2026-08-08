const titleMap: Record<string, string> = {
  music: "Turn the speakers up",
  sport: "Athletic",
  education: "Never enough of knowledge",
  fun: "Fun to be around",
  birthday: "Likes birthdays",
  conference: "Networker",
  charity: "Likes helping others",
};

export function getTitleForCategory(categoryName: string): string {
  const key = categoryName.toLowerCase();
  return titleMap[key] ?? `Likes the category of: "${categoryName}"`;
}
