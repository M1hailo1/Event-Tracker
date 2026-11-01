import { Prisma } from "@prisma/client";
import { userCanViewEvent } from "../controllers/eventController";

export async function notifyComment(tx: Prisma.TransactionClient, comment: { id: string; eventId: string; parentId: string | null; userId: string }) {
  const event = await tx.event.findUniqueOrThrow({ where: { id: comment.eventId } });
  const parent = comment.parentId ? await tx.eventComment.findUnique({ where: { id: comment.parentId } }) : null;
  const userId = parent ? parent.userId : event.createdByUserId;
  if (userId === comment.userId || !(await userCanViewEvent(event, userId))) return;
  const type = parent ? "COMMENT_REPLY" : "EVENT_COMMENT";
  const groupKey = `${userId}:${type}:${parent?.id ?? event.id}`;
  const message = parent ? `New replies to your comment on "${event.name}"` : `New comments on your event "${event.name}"`;
  await tx.notification.upsert({
    where: { groupKey },
    create: { userId, type, groupKey, message, eventId: event.id, commentId: comment.id },
    update: { activityCount: { increment: 1 }, commentId: comment.id, message, createdAt: new Date() },
  });
}
