import type { Prisma } from "@prisma/client";

export function getEventState(event: { date: Date; endDate?: Date | null; cancelledAt?: Date | null }, now = new Date()) {
  if (event.cancelledAt) return "CANCELLED";
  if ((event.endDate ?? event.date) <= now) return "ENDED";
  return event.date <= now ? "ONGOING" : "UPCOMING";
}

export function activeEventsWhere(now = new Date()): Prisma.EventWhereInput {
  return { cancelledAt: null, OR: [{ endDate: { gt: now } }, { endDate: null, date: { gt: now } }] };
}

export function endedEventsWhere(now = new Date()): Prisma.EventWhereInput {
  return { OR: [{ endDate: { lte: now } }, { endDate: null, date: { lte: now } }] };
}

export function validUpdatedDates(existing: { date: Date; endDate?: Date | null }, patch: { date?: string | undefined; endDate?: string | null | undefined }) {
  const start = patch.date === undefined ? existing.date : new Date(patch.date);
  const end = patch.endDate === undefined ? existing.endDate : patch.endDate === null ? null : new Date(patch.endDate);
  return !end || end > start;
}
