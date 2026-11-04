import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { saveableEventsWhere, savedEventsWhere } from "../utils/savedEvents";

export async function getSavedEventIds(req: Request, res: Response) {
  const events = await prisma.event.findMany({ where: savedEventsWhere(req.userId!), select: { id: true } });
  res.setHeader("Cache-Control", "no-store");
  res.json(events.map(event => event.id));
}

export async function saveEvent(req: Request, res: Response) {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Invalid event ID" });
  const event = await prisma.event.findFirst({ where: { id: id.data, AND: [saveableEventsWhere(req.userId!)] }, select: { id: true } });
  if (!event) return res.status(404).json({ error: "Event unavailable" });
  await prisma.savedEvent.upsert({
    where: { userId_eventId: { userId: req.userId!, eventId: id.data } },
    create: { userId: req.userId!, eventId: id.data },
    update: {},
  });
  res.json({ saved: true });
}

export async function unsaveEvent(req: Request, res: Response) {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Invalid event ID" });
  // Removal stays available even if event access has since been revoked.
  await prisma.savedEvent.deleteMany({ where: { userId: req.userId!, eventId: id.data } });
  res.json({ saved: false });
}
