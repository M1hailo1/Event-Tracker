export const eventCovers = [
  {
    "id": "music-live",
    "label": "Live music",
    "group": "Music"
  },
  {
    "id": "music-dj",
    "label": "DJ night",
    "group": "Music"
  },
  {
    "id": "music-acoustic",
    "label": "Acoustic session",
    "group": "Music"
  },
  {
    "id": "sport-football",
    "label": "Football",
    "group": "Sports"
  },
  {
    "id": "sport-running",
    "label": "Running club",
    "group": "Sports"
  },
  {
    "id": "sport-fitness",
    "label": "Fitness",
    "group": "Sports"
  },
  {
    "id": "education-books",
    "label": "Book club",
    "group": "Education"
  },
  {
    "id": "education-workshop",
    "label": "Workshop",
    "group": "Workshops & DIY"
  },
  {
    "id": "education-science",
    "label": "Science meetup",
    "group": "Education"
  },
  {
    "id": "fun-games",
    "label": "Game night",
    "group": "Gaming"
  },
  {
    "id": "fun-cinema",
    "label": "Movie night",
    "group": "Film"
  },
  {
    "id": "fun-picnic",
    "label": "Picnic",
    "group": "Outdoors & Adventure"
  },
  {
    "id": "birthday-cake",
    "label": "Birthday cake",
    "group": "Birthdays & Celebrations"
  },
  {
    "id": "birthday-balloons",
    "label": "Birthday party",
    "group": "Birthdays & Celebrations"
  },
  {
    "id": "birthday-celebration",
    "label": "Celebration",
    "group": "Birthdays & Celebrations"
  },
  {
    "id": "conference-talk",
    "label": "Conference",
    "group": "Business & Networking"
  },
  {
    "id": "conference-network",
    "label": "Networking",
    "group": "Business & Networking"
  },
  {
    "id": "conference-tech",
    "label": "Tech meetup",
    "group": "Technology"
  },
  {
    "id": "charity-hands",
    "label": "Helping hands",
    "group": "Community & Volunteering"
  },
  {
    "id": "charity-nature",
    "label": "Community garden",
    "group": "Community & Volunteering"
  },
  {
    "id": "charity-community",
    "label": "Community",
    "group": "Community & Volunteering"
  },
  {
    "id": "general-sunset",
    "label": "Outdoors",
    "group": "Outdoors & Adventure"
  },
  {
    "id": "general-coffee",
    "label": "Coffee meetup",
    "group": "Food & Drink"
  },
  {
    "id": "general-gathering",
    "label": "Get together",
    "group": "Other"
  },
  {
    "id": "arts-painting",
    "label": "Art studio",
    "group": "Arts & Culture"
  },
  {
    "id": "arts-museum",
    "label": "Museum visit",
    "group": "Arts & Culture"
  },
  {
    "id": "nightlife-dance",
    "label": "Dance night",
    "group": "Nightlife"
  },
  {
    "id": "wellness-yoga",
    "label": "Yoga",
    "group": "Fitness & Wellness"
  },
  {
    "id": "wellness-mindful",
    "label": "Mindful moments",
    "group": "Fitness & Wellness"
  },
  {
    "id": "outdoors-camping",
    "label": "Camping",
    "group": "Outdoors & Adventure"
  },
  {
    "id": "outdoors-hiking",
    "label": "Hiking",
    "group": "Outdoors & Adventure"
  },
  {
    "id": "workshop-pottery",
    "label": "Pottery workshop",
    "group": "Workshops & DIY"
  },
  {
    "id": "workshop-crafts",
    "label": "Craft together",
    "group": "Workshops & DIY"
  },
  {
    "id": "tech-robotics",
    "label": "Robotics",
    "group": "Technology"
  },
  {
    "id": "business-ideas",
    "label": "Ideas together",
    "group": "Business & Networking"
  },
  {
    "id": "social-meetup",
    "label": "Social meetup",
    "group": "Social & Meetups"
  },
  {
    "id": "food-cooking",
    "label": "Cooking",
    "group": "Food & Drink"
  },
  {
    "id": "food-market",
    "label": "Food market",
    "group": "Food & Drink"
  },
  {
    "id": "family-play",
    "label": "Family day",
    "group": "Family & Kids"
  },
  {
    "id": "family-kites",
    "label": "Kite day",
    "group": "Family & Kids"
  }
] as const;

export function getEventCover(coverId?: string | null) {
  return eventCovers.find(cover => cover.id === coverId);
}

export function eventCoverUrl(id: string) {
  return `${import.meta.env.BASE_URL}event-covers/${id}.webp`;
}
