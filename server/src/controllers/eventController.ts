import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { getNextDate } from "../utils/recurrence";
import { createNotification } from "../utils/createNotification";

const baseEventSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
  date: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  location: z.string().min(2),
  latitude: z.number(),
  longitude: z.number(),
  maxCapacity: z.number().int().positive().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrencePattern: z
    .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
    .optional(),
  isInviteOnly: z.boolean().optional().default(false),
});

const createEventSchema = baseEventSchema
  .refine((data) => new Date(data.date) > new Date(), {
    message: "Event date must be in the future",
    path: ["date"],
  })
  .refine(
    (data) => !data.endDate || new Date(data.endDate) > new Date(data.date),
    { message: "End date must be after the start date", path: ["endDate"] },
  );

export async function createEvent(req: Request, res: Response) {
  const parseResult = createEventSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const data = parseResult.data;

  const event = await prisma.event.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      categoryId: data.categoryId,
      date: new Date(data.date),
      endDate: data.endDate ? new Date(data.endDate) : null,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      maxCapacity: data.maxCapacity ?? null,
      isRecurring: data.isRecurring,
      recurrencePattern: data.recurrencePattern ?? null,
      isInviteOnly: data.isInviteOnly,
      createdByUserId: req.userId!,
    },
  });

  await prisma.registration.create({
    data: {
      userId: req.userId!,
      eventId: event.id,
      status: "CONFIRMED",
    },
  });

  const creator = await prisma.user.findUnique({ where: { id: req.userId! } });
  const followers = await prisma.follow.findMany({
    where: { followingId: req.userId! },
    select: { followerId: true },
  });

  await Promise.all(
    followers.map((f) =>
      createNotification(
        f.followerId,
        "NEW_EVENT_FROM_FOLLOWED",
        `${creator?.name} created a new event: ${event.name}`,
        event.id,
      ),
    ),
  );

  res.status(201).json(event);
}

export async function getAllEvents(req: Request, res: Response) {
  await generateMissingRecurringInstances();

  const showPast = req.query.includePast === "true";

  const events = await prisma.event.findMany({
    where: showPast
      ? { date: { lt: new Date() } }
      : { date: { gte: new Date() } },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { date: showPast ? "desc" : "asc" },
  });

  res.status(200).json(events);
}

export async function getEventById(req: Request, res: Response) {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Nevazeci ID" });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      category: true,
      createdBy: {
        select: { id: true, name: true },
      },
      registrations: {
        where: { status: "CONFIRMED" },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      _count: {
        select: { registrations: true },
      },
    },
  });

  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  res.status(200).json(event);
}

const updateEventSchema = baseEventSchema
  .partial()
  .refine((data) => !data.date || new Date(data.date) > new Date(), {
    message: "Event date must be in the future",
    path: ["date"],
  });

export async function updateEvent(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return res.status(404).json({ error: "Event not found" });
  }

  if (existingEvent.createdByUserId !== req.userId) {
    return res
      .status(403)
      .json({ error: "You don't have permission to edit this event" });
  }

  if (existingEvent.date < new Date()) {
    return res
      .status(403)
      .json({ error: "You can't edit events that finished" });
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
      ...(data.isInviteOnly !== undefined && {
        isInviteOnly: data.isInviteOnly,
      }),
    },
  });

  res.status(200).json(updatedEvent);
}

export async function deleteEvent(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return res.status(404).json({ error: "Event not found" });
  }

  if (existingEvent.createdByUserId !== req.userId) {
    return res
      .status(403)
      .json({ error: "You don't have permission to delete this event" });
  }

  if (existingEvent.date < new Date()) {
    return res
      .status(403)
      .json({ error: "You can't delete events that finished" });
  }

  await prisma.$transaction([
    prisma.registration.deleteMany({ where: { eventId: id } }),
    prisma.event.delete({ where: { id } }),
  ]);

  res.status(200).json({ message: "Event successfully deleted" });
}

async function generateMissingRecurringInstances() {
  const expiredRecurring = await prisma.event.findMany({
    where: {
      isRecurring: true,
      date: { lt: new Date() },
      nextInstances: { none: {} },
    },
  });

  for (const event of expiredRecurring) {
    if (!event.recurrencePattern) continue;

    let nextDate = getNextDate(event.date, event.recurrencePattern);

    while (nextDate < new Date()) {
      nextDate = getNextDate(nextDate, event.recurrencePattern);
    }

    await prisma.event.create({
      data: {
        name: event.name,
        description: event.description,
        categoryId: event.categoryId,
        date: nextDate,
        location: event.location,
        latitude: event.latitude,
        longitude: event.longitude,
        maxCapacity: event.maxCapacity,
        isRecurring: event.isRecurring,
        recurrencePattern: event.recurrencePattern,
        isInviteOnly: event.isInviteOnly,
        createdByUserId: event.createdByUserId,
        parentEventId: event.id,
      },
    });
  }
}
