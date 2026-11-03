import { z } from "zod";
import { validUpdatedDates } from "../utils/eventLifecycle";
import { selectedCategoryIds, validCategorySelection, curatedCategoryWhere } from "../utils/eventCategories";
import { Request, Response } from "express";
import prisma from "../prisma";
import { updateEventSchema } from "./eventController";
import { createNotification } from "../utils/createNotification";
import { computeBannedUntil, type BanDuration } from "../utils/banDuration";

const VALID_DURATIONS: BanDuration[] = ["1h", "1w", "1m", "forever"];

async function canManageAccount(actorId: string, targetRole: string) {
  if (targetRole !== "ADMIN") return true;
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
  return actor?.role === "ADMIN";
}

export async function getAdminStats(req: Request, res: Response) {
  const [userCount, eventCount, upcomingEventCount, registrationCount, categoryCount, adminCount, moderatorCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.event.count({ where: { date: { gte: new Date() } } }),
      prisma.registration.count({ where: { status: "CONFIRMED" } }),
      prisma.category.count({ where: curatedCategoryWhere }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "MODERATOR" } }),
    ]);

  res.status(200).json({
    userCount,
    eventCount,
    upcomingEventCount,
    registrationCount,
    categoryCount,
    adminCount,
    moderatorCount,
  });
}

export async function getAllUsersAdmin(req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bannedUntil: true,
      banReason: true,
      createdAt: true,
      _count: {
        select: { events: true, registrations: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json(users);
}

export async function banUserAdmin(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (id === req.userId) {
    return res.status(400).json({ error: "You can't ban your own account" });
  }

  const duration = req.body.duration;
  if (!VALID_DURATIONS.includes(duration)) {
    return res.status(400).json({
      error: "duration must be one of: 1h, 1w, 1m, forever",
    });
  }

  const reason = req.body.reason;
  if (reason !== undefined && (typeof reason !== "string" || reason.trim().length > 500)) {
    return res.status(400).json({ error: "Ban reason must be text with at most 500 characters" });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (!(await canManageAccount(req.userId!, user.role))) {
    return res.status(403).json({ error: "Moderators cannot manage admin accounts" });
  }

  const bannedUntil = computeBannedUntil(duration);

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { bannedUntil, banReason: reason?.trim() || null },
    select: { id: true, name: true, email: true, role: true, bannedUntil: true, banReason: true },
  });

  res.status(200).json(updatedUser);
}

export async function unbanUserAdmin(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (!(await canManageAccount(req.userId!, user.role))) {
    return res.status(403).json({ error: "Moderators cannot manage admin accounts" });
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { bannedUntil: null, banReason: null },
    select: { id: true, name: true, email: true, role: true, bannedUntil: true, banReason: true },
  });

  res.status(200).json(updatedUser);
}

export async function deleteUserAdmin(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (id === req.userId) {
    return res
      .status(400)
      .json({ error: "You can't delete your own account" });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (!(await canManageAccount(req.userId!, user.role))) {
    return res.status(403).json({ error: "Moderators cannot manage admin accounts" });
  }

  const ownedEvents = await prisma.event.findMany({
    where: { createdByUserId: id },
    select: { id: true },
  });
  const ownedEventIds = ownedEvents.map((e) => e.id);

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { userId: id } }),
    prisma.eventInvite.deleteMany({ where: { invitedUserId: id } }),
    prisma.follow.deleteMany({
      where: { OR: [{ followerId: id }, { followingId: id }] },
    }),
    prisma.registration.deleteMany({
      where: { OR: [{ userId: id }, { eventId: { in: ownedEventIds } }] },
    }),
    prisma.eventInvite.deleteMany({
      where: { eventId: { in: ownedEventIds } },
    }),
    prisma.event.deleteMany({ where: { id: { in: ownedEventIds } } }),
    prisma.user.delete({ where: { id } }),
  ]);

  res.status(200).json({ message: "User successfully deleted" });
}

export async function getAllEventsAdmin(req: Request, res: Response) {
  const events = await prisma.event.findMany({
    include: {
      category: true,
      categories: true,
      createdBy: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { date: "desc" },
  });

  res.status(200).json(events);
}

export async function updateEventAdmin(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return res.status(404).json({ error: "Event not found" });
  }

  const parseResult = updateEventSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const data = parseResult.data;

  if (!validUpdatedDates(existingEvent, data)) return res.status(400).json({ error: "End date must be after the start date" });

  const categoryIds = selectedCategoryIds(data);
  if (!await validCategorySelection(categoryIds)) return res.status(400).json({ error: "Choose categories from the collection" });

  const updatedEvent = await prisma.event.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.coverId !== undefined && { coverId: data.coverId }),
      ...(data.description !== undefined && { description: data.description }),
      ...(categoryIds && { categoryId: categoryIds[0]!, categories: { set: categoryIds.map(id => ({ id })) } }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.endDate !== undefined && {
        endDate: data.endDate ? new Date(data.endDate) : null,
      }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.maxCapacity !== undefined && { maxCapacity: data.maxCapacity }),
      ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
      ...(data.recurrencePattern !== undefined && {
        recurrencePattern: data.recurrencePattern,
      }),
      ...(data.visibility !== undefined && {
        visibility: data.visibility,
      }),
    },
  });

  const registeredUsers = await prisma.registration.findMany({
    where: { eventId: id, status: "CONFIRMED" },
    select: { userId: true },
  });

  await Promise.all(
    registeredUsers.map((r) =>
      createNotification(
        r.userId,
        "EVENT_UPDATED",
        `The event "${updatedEvent.name}" you're registered for has been updated`,
        updatedEvent.id,
      ),
    ),
  );

  res.status(200).json(updatedEvent);
}

export async function deleteEventAdmin(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return res.status(404).json({ error: "Event not found" });
  }

  const registeredUsers = await prisma.registration.findMany({
    where: { eventId: id, status: "CONFIRMED" },
    select: { userId: true },
  });

  await prisma.$transaction([
    prisma.registration.deleteMany({ where: { eventId: id } }),
    prisma.eventInvite.deleteMany({ where: { eventId: id } }),
    prisma.event.delete({ where: { id } }),
  ]);

  await Promise.all(
    registeredUsers.map((r) =>
      createNotification(
        r.userId,
        "EVENT_CANCELLED",
        `The event "${existingEvent.name}" you were registered for has been cancelled by an admin`,
      ),
    ),
  );

  res.status(200).json({ message: "Event successfully deleted" });
}

// Only USER <-> MODERATOR transitions are available through the application.
export async function setModeratorRole(req: Request, res: Response) {
  const parsed = z.object({ role: z.enum(["USER", "MODERATOR"]) }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose USER or MODERATOR" });
  const id = req.params.id as string;
  const result = await prisma.user.updateMany({
    where: { id, role: { in: ["USER", "MODERATOR"] } },
    data: { role: parsed.data.role },
  });
  if (!result.count) {
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    return res.status(target ? 403 : 404).json({ error: target ? "Admin roles cannot be changed here" : "User not found" });
  }
  const updated = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  res.json(updated);
}
