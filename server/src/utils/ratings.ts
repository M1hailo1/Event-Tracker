import prisma from "../prisma";

export async function getRatingSummary(where: { eventId?: string; event?: { createdByUserId: string } }) {
  const result = await prisma.eventRating.aggregate({
    where,
    _avg: { score: true },
    _count: { score: true },
  });
  return { average: result._avg.score, count: result._count.score };
}

export async function withEventRatings<T extends { id: string }>(events: T[]) {
  if (!events.length) return [];
  const summaries = await prisma.eventRating.groupBy({
    by: ["eventId"],
    where: { eventId: { in: events.map(event => event.id) } },
    _avg: { score: true },
    _count: { score: true },
  });
  const ratings = new Map(summaries.map(summary => [summary.eventId, {
    average: summary._avg.score, count: summary._count.score,
  }]));
  return events.map(event => ({ ...event, rating: ratings.get(event.id) ?? { average: null, count: 0 } }));
}
