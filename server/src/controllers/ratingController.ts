import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { userCanViewEvent } from "./eventController";

const ratingSchema = z.object({ score: z.number().int().min(1).max(5) });

export async function rateEvent(req: Request, res: Response) {
  const id = req.params.id;
  if (typeof id !== "string") return res.status(400).json({ error: "Invalid event ID" });
  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a whole number from 1 to 5" });
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (event.cancelledAt) return res.status(409).json({ error: "Cancelled events cannot be rated" });
  if (!(await userCanViewEvent(event, req.userId))) {
    return res.status(403).json({ error: "You don't have access to this event" });
  }
  if (event.createdByUserId === req.userId) {
    return res.status(403).json({ error: "You can't rate your own event" });
  }
  if ((event.endDate ?? event.date) > new Date()) {
    return res.status(403).json({ error: "Ratings open after the event ends" });
  }
  const registration = await prisma.registration.findUnique({
    where: { userId_eventId: { userId: req.userId!, eventId: id } },
  });
  if (registration?.status !== "CONFIRMED") {
    return res.status(403).json({ error: "Only confirmed attendees can rate this event" });
  }
  const rating = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${id} FOR UPDATE`;
    const saved = await tx.eventRating.upsert({
      where: { userId_eventId: { userId: req.userId!, eventId: id } },
      create: { userId: req.userId!, eventId: id, score: parsed.data.score },
      update: { score: parsed.data.score },
    });
    await tx.notification.deleteMany({ where: { userId: req.userId!, eventId: id, type: "EVENT_RATING_PROMPT" } });
    return saved;
  });
  return res.status(200).json({ score: rating.score });
}
