import prisma from "../prisma";
import { endedEventsWhere } from "./eventLifecycle";
import { userCanViewEvent } from "../controllers/eventController";
import { isCurrentlyBanned } from "./banDuration";

export async function sendDueEventRatingPrompts() {
  const candidates = await prisma.registration.findMany({
    where: {
      status: "CONFIRMED", ratingPromptSent: false,
      event: { cancelledAt: null, AND: [endedEventsWhere()] },
    },
    orderBy: { id: "asc" },
    take: 100,
    select: { id: true, eventId: true },
  });

  for (const candidate of candidates) {
    try {
      await prisma.$transaction(async tx => {
        // Coordinate overlapping workers, cancellation and rating submission.
        await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${candidate.eventId} FOR UPDATE`;
        const event = await tx.event.findUnique({ where: { id: candidate.eventId } });
        const registration = await tx.registration.findUnique({ where: { id: candidate.id } });
        if (!event || event.cancelledAt || !registration || registration.ratingPromptSent ||
            registration.status !== "CONFIRMED" || (event.endDate ?? event.date) > new Date()) return;

        const endpoint = event.endDate ?? event.date;
        const user = await tx.user.findUnique({ where: { id: registration.userId }, select: { bannedUntil: true } });
        const rating = await tx.eventRating.findUnique({
          where: { userId_eventId: { userId: registration.userId, eventId: event.id } },
        });
        if (endpoint > event.ratingPromptAfter && registration.userId !== event.createdByUserId &&
            user && !isCurrentlyBanned(user.bannedUntil) && !rating &&
            await userCanViewEvent(event, registration.userId)) {
          await tx.notification.create({
            data: {
              userId: registration.userId, eventId: event.id, type: "EVENT_RATING_PROMPT",
              message: `How was "${event.name}"? You can rate the event if you'd like.`,
            },
          });
        }
        // Durable even after notification cleanup; never repeatedly ask for a rating.
        await tx.registration.update({ where: { id: registration.id }, data: { ratingPromptSent: true } });
      });
    } catch (error) {
      console.error(`Failed to send rating prompt for registration ${candidate.id}:`, error);
    }
  }
}
