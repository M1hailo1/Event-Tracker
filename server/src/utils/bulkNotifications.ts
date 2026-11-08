import type { NotificationType, Prisma } from "@prisma/client";

const BATCH_SIZE = 500;
export const notificationTransactionOptions = { timeout: 15000 };

export async function notifyEventFollowers(tx: Prisma.TransactionClient, organizerId: string, eventId: string, message: string) {
  let lastId: string | undefined;
  while (true) {
    const followers: { id: string; followerId: string }[] = await tx.follow.findMany({
      where: { followingId: organizerId, ...(lastId && { id: { gt: lastId } }) },
      select: { id: true, followerId: true }, orderBy: { id: "asc" }, take: BATCH_SIZE,
    });
    if (!followers.length) return;
    await tx.notification.createMany({ data: followers.map(follower => ({
      userId: follower.followerId, type: "NEW_EVENT_FROM_FOLLOWED", message, eventId,
    })) });
    lastId = followers[followers.length - 1]!.id;
    if (followers.length < BATCH_SIZE) return;
  }
}

export async function notifyEventRegistrations(tx: Prisma.TransactionClient, eventId: string, type: NotificationType,
  message: string, excludeUserId?: string, linkEvent = true) {
  let lastId: string | undefined;
  while (true) {
    const registrations: { id: string; userId: string }[] = await tx.registration.findMany({
      where: { eventId, status: "CONFIRMED", ...(excludeUserId && { userId: { not: excludeUserId } }), ...(lastId && { id: { gt: lastId } }) },
      select: { id: true, userId: true }, orderBy: { id: "asc" }, take: BATCH_SIZE,
    });
    if (!registrations.length) return;
    await tx.notification.createMany({ data: registrations.map(registration => ({
      userId: registration.userId, type, message, eventId: linkEvent ? eventId : null,
    })) });
    lastId = registrations[registrations.length - 1]!.id;
    if (registrations.length < BATCH_SIZE) return;
  }
}
