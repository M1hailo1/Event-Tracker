import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma";

const reportSchema = z.object({
  reason: z.enum(["HARASSMENT", "SPAM", "INAPPROPRIATE", "OTHER"]),
  details: z.string().trim().max(500).optional(),
});
export async function reportComment(req: Request, res: Response) {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a reason and use at most 500 characters for details" });
  const comment = await prisma.eventComment.findFirst({ where: {
    id: req.params.commentId as string, eventId: req.params.id as string, deletedAt: null,
  } });
  if (!comment) return res.status(404).json({ error: "Comment not found" });
  if (comment.userId === req.userId) return res.status(400).json({ error: "You can't report your own comment" });
  const reportKey = { commentId: comment.id, reporterId: req.userId! };
  await prisma.commentReport.updateMany({
    where: { ...reportKey, status: "DISMISSED", bodySnapshot: { not: comment.body } },
    data: { status: "OPEN", reason: parsed.data.reason, details: parsed.data.details ?? null,
      bodySnapshot: comment.body, createdAt: new Date(), reviewedAt: null, reviewedBy: null },
  });
  await prisma.commentReport.upsert({
    where: { commentId_reporterId: { commentId: comment.id, reporterId: req.userId! } },
    create: { commentId: comment.id, reporterId: req.userId!, reason: parsed.data.reason,
      details: parsed.data.details ?? null, bodySnapshot: comment.body },
    update: {},
  });
  res.status(201).json({ message: "Report submitted for admin review" });
}

const queueSchema = z.object({
  status: z.enum(["OPEN", "DISMISSED", "REMOVED"]).default("OPEN"),
  cursor: z.string().uuid().optional(),
});
export async function getCommentReports(req: Request, res: Response) {
  const parsed = queueSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid report page" });
  const { status, cursor } = parsed.data;
  if (cursor && !(await prisma.commentReport.findUnique({ where: { id: cursor } }))) {
    return res.status(400).json({ error: "Invalid report cursor" });
  }
  const rows = await prisma.commentReport.findMany({
    where: { status }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      reporter: { select: { id: true, name: true } },
      comment: { select: { id: true, body: true, deletedAt: true,
        user: { select: { id: true, name: true, role: true } },
        event: { select: { id: true, name: true } } } },
    },
  });
  res.json({ reports: rows.slice(0, 20), nextCursor: rows.length > 20 ? rows[19]!.id : null });
}

export async function reviewCommentReport(req: Request, res: Response) {
  const parsed = z.object({ action: z.enum(["DISMISS", "REMOVE"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose dismiss or remove" });
  const report = await prisma.commentReport.findUnique({ where: { id: req.params.reportId as string } });
  if (!report) return res.status(404).json({ error: "Report not found" });
  const result = await prisma.$transaction(async tx => {
    const updated = await tx.commentReport.updateMany({
      where: { commentId: report.commentId, status: "OPEN" },
      data: { status: parsed.data.action === "REMOVE" ? "REMOVED" : "DISMISSED", reviewedAt: new Date(), reviewedBy: req.userId! },
    });
    if (updated.count && parsed.data.action === "REMOVE") {
      await tx.eventComment.updateMany({ where: { id: report.commentId, deletedAt: null }, data: { body: "", deletedAt: new Date() } });
    }
    return updated.count;
  });
  if (!result) return res.status(409).json({ error: "This comment's reports have already been reviewed" });
  res.json({ message: "Reports reviewed" });
}
