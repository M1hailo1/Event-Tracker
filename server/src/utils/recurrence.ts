import { RecurrencePattern } from "@prisma/client";

export function getNextDate(
  currentDate: Date,
  pattern: RecurrencePattern,
): Date {
  const next = new Date(currentDate);

  switch (pattern) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}
