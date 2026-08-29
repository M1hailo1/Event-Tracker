import prisma from "../prisma";

const READ_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export async function cleanupOldNotifications() {
  const readCutoff = new Date(Date.now() - READ_RETENTION_MS);
  const hardCutoff = new Date(Date.now() - MAX_RETENTION_MS);

  const result = await prisma.notification.deleteMany({
    where: {
      OR: [
        { isRead: true, createdAt: { lt: readCutoff } },
        { createdAt: { lt: hardCutoff } },
      ],
    },
  });

  if (result.count > 0) {
    console.log(`Cleaned up ${result.count} old notification(s)`);
  }
}
