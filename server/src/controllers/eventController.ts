import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma";

const createEventSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
  date: z.string().datetime(),
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

  res.status(201).json(event);
}

export async function getAllEvents(req: Request, res: Response) {
  const events = await prisma.event.findMany({
    include: {
      category: true,
      createdBy: {
        select: { id: true, name: true },
      },
      _count: {
        select: { registrations: true },
      },
    },
    orderBy: { date: "asc" },
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

const updateEventSchema = createEventSchema.partial();

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

  await prisma.event.delete({ where: { id } });

  res.status(200).json({ message: "Event successfully deleted" });
}
