import { Request, Response } from "express";
import prisma from "../prisma";

export async function registerForEvent(req: Request, res: Response) {
  const eventId = req.params.id;
  if (!eventId || typeof eventId !== "string") {
    return res.status(400).json({ error: "Invalid event ID" });
  }

  const userId = req.userId!;

  try {
    const registration = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: {
          _count: {
            select: { registrations: { where: { status: "CONFIRMED" } } },
          },
        },
      });

      if (!event) {
        throw new Error("EVENT_NOT_FOUND");
      }

      const existing = await tx.registration.findUnique({
        where: { userId_eventId: { userId, eventId } },
      });

      if (existing) {
        throw new Error("ALREADY_REGISTERED");
      }

      if (
        event.maxCapacity !== null &&
        event._count.registrations >= event.maxCapacity
      ) {
        throw new Error("EVENT_FULL");
      }

      return tx.registration.create({
        data: {
          userId,
          eventId,
          status: "CONFIRMED",
        },
      });
    });

    res.status(201).json(registration);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "EVENT_NOT_FOUND") {
        return res.status(404).json({ error: "Event not found" });
      }
      if (err.message === "ALREADY_REGISTERED") {
        return res
          .status(409)
          .json({ error: "You are already registered to this event" });
      }
      if (err.message === "EVENT_FULL") {
        return res.status(409).json({ error: "Event is full" });
      }
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function unregisterFromEvent(req: Request, res: Response) {
  const eventId = req.params.id;
  if (!eventId || typeof eventId !== "string") {
    return res.status(400).json({ error: "Invalid event ID" });
  }

  const userId = req.userId!;

  const registration = await prisma.registration.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });

  if (!registration) {
    return res
      .status(404)
      .json({ error: "You are not registered to this event" });
  }

  await prisma.registration.delete({
    where: { userId_eventId: { userId, eventId } },
  });

  res.status(200).json({ message: "Successfully unregistered from the event" });
}
