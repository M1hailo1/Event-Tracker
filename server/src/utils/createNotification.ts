import prisma from "../prisma";
import { NotificationType } from "@prisma/client";

export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  eventId?: string,
) {
  await prisma.notification.create({
    data: {
      userId,
      type,
      message,
      eventId: eventId ?? null,
    },
  });
}
