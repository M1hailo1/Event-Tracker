const titleMap: Record<string, string> = {
  music: "Turn the speakers up",
  sport: "Athletic",
  education: "Never enough of knowledge",
  fun: "Fun to be around",
  birthday: "Likes birthdays",
  conference: "Networker",
  charity: "Likes helping others",
  sports: "Athletic",
  "arts & culture": "Art enthusiast",
  film: "Film fan",
  gaming: "Game enthusiast",
  nightlife: "Night owl",
  "fitness & wellness": "Wellness enthusiast",
  "outdoors & adventure": "Outdoor explorer",
  "workshops & diy": "Hands-on learner",
  technology: "Tech enthusiast",
  "business & networking": "Networker",
  "social & meetups": "Enjoys meeting people",
  "food & drink": "Food enthusiast",
  "community & volunteering": "Community helper",
  "birthdays & celebrations": "Enjoys a celebration",
  "family & kids": "Enjoys family activities",
  other: "Always exploring",
};

export function getTitleForCategory(categoryName: string): string {
  const key = categoryName.toLowerCase();
  return titleMap[key] ?? `Likes the category of: "${categoryName}"`;
}
