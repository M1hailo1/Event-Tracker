import type { Prisma } from "@prisma/client";

// Called inside the registration transaction, while the event row is locked.
export async function notifyEventJoin(tx: Prisma.TransactionClient, event: {
  id: string;
  name: string;
  createdByUserId: string;
}, joiningUserId: string) {
  if (joiningUserId === event.createdByUserId) return;
  const groupKey = `${event.createdByUserId}:EVENT_JOINED:${event.id}`;
  const notification = await tx.notification.upsert({
    where: { groupKey },
    create: {
      userId: event.createdByUserId, type: "EVENT_JOINED", groupKey,
      eventId: event.id, message: `1 person joined your event "${event.name}"`,
    },
    update: { activityCount: { increment: 1 }, createdAt: new Date() },
  });
  if (notification.activityCount > 1) {
    await tx.notification.update({
      where: { id: notification.id },
      data: { message: `${notification.activityCount} people joined your event "${event.name}"` },
    });
  }
}
