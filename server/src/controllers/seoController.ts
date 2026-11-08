import { Request, Response } from "express";
import prisma from "../prisma";

export async function getSitemapEvents(_req: Request, res: Response) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      visibility: "PUBLIC", cancelledAt: null, date: { gt: now },
      createdBy: { OR: [{ bannedUntil: null }, { bannedUntil: { lte: now } }] },
      NOT: { name: { startsWith: "[DEMO]", mode: "insensitive" } },
      OR: [
        { description: null },
        { NOT: [
          { description: { contains: "NOT A REAL EVENT", mode: "insensitive" } },
          { description: { contains: "DEMONSTRATION ONLY", mode: "insensitive" } },
        ] },
      ],
    },
    select: { id: true }, orderBy: [{ date: "asc" }, { id: "asc" }], take: 49999,
  });
  res.setHeader("Cache-Control", "no-store");
  res.json(events);
}
