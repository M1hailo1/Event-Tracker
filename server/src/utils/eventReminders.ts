import prisma from "../prisma";
import { createNotification } from "./createNotification";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function sendDueEventReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const dueRegistrations = await prisma.registration.findMany({
    where: {
      status: "CONFIRMED",
      reminderSent: false,
      event: {
        date: { gte: now, lte: windowEnd },
      },
    },
    include: {
      event: { select: { id: true, name: true } },
    },
  });

  for (const registration of dueRegistrations) {
    try {
      await createNotification(
        registration.userId,
        "EVENT_REMINDER",
        `Reminder: "${registration.event.name}" starts in less than 24 hours`,
        registration.event.id,
      );

      await prisma.registration.update({
        where: { id: registration.id },
        data: { reminderSent: true },
      });
    } catch (err) {
      console.error(
        `Failed to send event reminder for registration ${registration.id}:`,
        err,
      );
    }
  }
}
