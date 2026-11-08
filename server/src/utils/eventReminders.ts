import prisma from "../prisma";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
let running: Promise<void> | undefined;

export function sendDueEventReminders() {
  running ??= processDueEventReminders().finally(() => { running = undefined; });
  return running;
}

async function processDueEventReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const dueRegistrations = await prisma.registration.findMany({
    where: {
      status: "CONFIRMED",
      reminderSent: false,
      event: {
        cancelledAt: null,
        date: { gte: now, lte: windowEnd },
      },
    },
    include: {
      event: { select: { id: true, name: true } },
    },
    orderBy: [{ event: { date: "asc" } }, { id: "asc" }],
    take: 1000,
  });

  for (const registration of dueRegistrations) {
    try {
      await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${registration.event.id} FOR UPDATE`;
        const event = await tx.event.findUnique({ where: { id: registration.event.id } });
        const current = await tx.registration.findUnique({ where: { id: registration.id } });
        if (!event || event.cancelledAt || event.date <= new Date() || !current || current.reminderSent || current.status !== "CONFIRMED") return;
        await tx.notification.create({ data: { userId: registration.userId, type: "EVENT_REMINDER", message: `Reminder: "${event.name}" starts in less than 24 hours`, eventId: event.id } });
        await tx.registration.update({ where: { id: registration.id }, data: { reminderSent: true } });
      });
    } catch (err) {
      console.error(
        `Failed to send event reminder for registration ${registration.id}:`,
        err,
      );
    }
  }
}
