import { AuditAction, Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { readPagination, paged } from "../utils/pagination";

const filters = z.object({
  action: z.nativeEnum(AuditAction).optional(),
  actor: z.string().trim().max(100).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export async function getAuditHistory(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  const parsed = filters.safeParse(req.query);
  const paging = readPagination(req, res);
  if (!paging) return;
  if (!parsed.success || (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to)) {
    return res.status(400).json({ error: "Choose valid audit filters and date range" });
  }
  const { action, actor, from, to } = parsed.data;
  const where: Prisma.AuditEntryWhereInput = {
    ...(action && { action }),
    ...(actor && { OR: [{ actorName: { contains: actor, mode: "insensitive" } }, { actorId: actor }] }),
    ...((from || to) && { createdAt: {
      ...(from && { gte: new Date(`${from}T00:00:00Z`) }),
      ...(to && { lt: new Date(new Date(`${to}T00:00:00Z`).getTime() + 86400000) }),
    } }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.auditEntry.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: paging.skip, take: paging.take }),
    prisma.auditEntry.count({ where }),
  ]);
  res.json(paged(items, total, paging));
}
