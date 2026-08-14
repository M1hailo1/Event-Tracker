import { Request, Response } from "express";
import prisma from "../prisma";

export async function getMyNotifications(req: Request, res: Response) {
  const userId = req.userId!;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.status(200).json(notifications);
}

export async function getUnreadCount(req: Request, res: Response) {
  const userId = req.userId!;

  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  res.status(200).json({ count });
}

export async function markAsRead(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const userId = req.userId!;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    return res.status(404).json({ error: "Notification not found" });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  res.status(200).json(updated);
}

export async function markAllAsRead(req: Request, res: Response) {
  const userId = req.userId!;

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  res.status(200).json({ message: "All notifications marked as read" });
}
