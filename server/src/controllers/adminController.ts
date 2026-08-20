import { Request, Response } from "express";
import prisma from "../prisma";
import { updateEventSchema } from "./eventController";
import { createNotification } from "../utils/createNotification";

export async function getAdminStats(req: Request, res: Response) {
  const [
    userCount,
    eventCount,
    upcomingEventCount,
    registrationCount,
    categoryCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.event.count({ where: { date: { gte: new Date() } } }),
    prisma.registration.count({ where: { status: "CONFIRMED" } }),
    prisma.category.count(),
  ]);

  res.status(200).json({
    userCount,
    eventCount,
    upcomingEventCount,
    registrationCount,
    categoryCount,
  });
}

export async function getAllUsersAdmin(req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: { events: true, registrations: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json(users);
}

export async function deleteUserAdmin(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (id === req.userId) {
    return res
      .status(400)
      .json({ error: "You can't delete your own admin account" });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
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

  const updatedEvent = await prisma.event.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
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
