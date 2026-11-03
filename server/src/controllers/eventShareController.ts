import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { eventCoverIds } from "../utils/eventCovers";

// Preview bots are anonymous: never use a viewer's token or staff privileges here.
export async function getEventSharePreview(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  const parsed = z.string().uuid().safeParse(req.params.id);
  if (!parsed.success) return res.status(404).json({ error: "Preview unavailable" });
  const event = await prisma.event.findFirst({
    where: {
      id: parsed.data, visibility: "PUBLIC",
      createdBy: { OR: [{ bannedUntil: null }, { bannedUntil: { lte: new Date() } }] },
    },
    select: {
      name: true, description: true, date: true, endDate: true, cancelledAt: true,
      coverId: true, createdBy: { select: { name: true } },
    },
  });
  if (!event) return res.status(404).json({ error: "Preview unavailable" });
  return res.json({
    visibility: "PUBLIC", name: event.name, description: event.description,
    date: event.date, endDate: event.endDate, cancelledAt: event.cancelledAt,
    organizer: event.createdBy.name,
    coverId: eventCoverIds.includes(event.coverId as typeof eventCoverIds[number]) ? event.coverId : null,
  });
}
