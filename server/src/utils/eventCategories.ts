import prisma from "../prisma";

export const categoryNames = [
  "Music",
  "Arts & Culture",
  "Film",
  "Gaming",
  "Nightlife",
  "Sports",
  "Fitness & Wellness",
  "Outdoors & Adventure",
  "Education",
  "Workshops & DIY",
  "Technology",
  "Business & Networking",
  "Social & Meetups",
  "Food & Drink",
  "Community & Volunteering",
  "Birthdays & Celebrations",
  "Family & Kids",
  "Other"
] as const;

export const curatedCategoryWhere = { isCustom: false, name: { in: [...categoryNames] } };

// categoryId remains the primary category for existing consumers.
export function selectedCategoryIds(data: { categoryIds?: string[] | undefined; categoryId?: string | undefined }) {
  return data.categoryIds ?? (data.categoryId ? [data.categoryId] : undefined);
}

export async function validCategorySelection(ids: string[] | undefined) {
  if (!ids) return true;
  const count = await prisma.category.count({ where: { ...curatedCategoryWhere, id: { in: ids } } });
  return count === ids.length;
}
