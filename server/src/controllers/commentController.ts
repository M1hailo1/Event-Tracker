import { notifyComment } from "../utils/notifyComment";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { userCanViewEvent } from "./eventController";

const bodySchema = z.object({ body: z.string().trim().min(1).max(2000) });
const createSchema = bodySchema.extend({
  parentId: z.string().uuid().optional(),
});
const pageSchema = z.object({
  parentId: z.string().uuid().optional(),
  cursor: z.string().uuid().optional(),
  targetId: z.string().uuid().optional(),
});
const commentInclude = {
  user: { select: { id: true, name: true, role: true } },
  _count: { select: { replies: { where: { deletedAt: null } } } },
} as const;

type Comment = NonNullable<
  Awaited<ReturnType<typeof prisma.eventComment.findUnique>>
>;
function serialize<
  T extends Comment & { user: { id: string; name: string; role: string } },
>(comment: T) {
  return {
    ...comment,
    body: comment.deletedAt ? "" : comment.body,
    user: comment.deletedAt ? null : comment.user,
  };
}

export async function requireCommentAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (typeof req.params.id !== "string")
    return res.status(400).json({ error: "Invalid event ID" });
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (!(await userCanViewEvent(event, req.userId)))
    return res
      .status(403)
      .json({ error: "You don't have access to this event" });
  next();
}

export async function getComments(req: Request, res: Response) {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid comment page" });
  const { parentId, cursor, targetId } = parsed.data;
  const eventId = req.params.id as string;
  if (parentId) {
    const parent = await prisma.eventComment.findFirst({
      where: { id: parentId, eventId, parentId: null },
    });
    if (!parent) return res.status(404).json({ error: "Comment not found" });
  }
  if (cursor) {
    const anchor = await prisma.eventComment.findFirst({
      where: { id: cursor, eventId, parentId: parentId ?? null },
    });
    if (!anchor)
      return res.status(400).json({ error: "Invalid comment cursor" });
  }
  const visible = { OR: [{ deletedAt: null }, { replies: { some: { deletedAt: null } } }] };
  if (targetId && !parentId) {
    const target = await prisma.eventComment.findFirst({ where: { id: targetId, eventId, ...visible } });
    if (!target) return res.status(404).json({ error: "This comment is no longer available" });
    const root = await prisma.eventComment.findFirst({ where: { id: target.parentId ?? target.id, eventId }, include: commentInclude });
    return res.json({ comments: root ? [serialize(root)] : [], nextCursor: null });
  }
  const comments = await prisma.eventComment.findMany({
    where: { eventId, parentId: parentId ?? null, ...visible },
    include: commentInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = comments.slice(0, 20);
  res.json({
    comments: page.map(serialize),
    nextCursor: comments.length > 20 ? page[19]!.id : null,
  });
}

export async function createComment(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Comments must contain 1-2000 characters" });
  const eventId = req.params.id as string;
  if (parsed.data.parentId) {
    const parent = await prisma.eventComment.findFirst({
      where: {
        id: parsed.data.parentId,
        eventId,
        parentId: null,
        deletedAt: null,
      },
    });
    if (!parent)
      return res
        .status(400)
        .json({ error: "Reply to an existing top-level comment" });
  }
  const comment = await prisma.$transaction(async tx => {
    const created = await tx.eventComment.create({
      data: {
        body: parsed.data.body,
        parentId: parsed.data.parentId ?? null,
        eventId,
        userId: req.userId!,
      },
      include: commentInclude,
    });
    await notifyComment(tx, created);
    return created;
  });
  res.status(201).json(serialize(comment));
}

export async function updateComment(req: Request, res: Response) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Comments must contain 1-2000 characters" });
  const result = await prisma.eventComment.updateMany({
    where: {
      id: req.params.commentId as string,
      eventId: req.params.id as string,
      userId: req.userId!,
      deletedAt: null,
    },
    data: { body: parsed.data.body },
  });
  if (!result.count)
    return res
      .status(403)
      .json({ error: "You can only edit your own existing comments" });
  res.json({ message: "Comment updated" });
}

export async function deleteComment(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { role: true },
  });
  const result = await prisma.eventComment.updateMany({
    where: {
      id: req.params.commentId as string,
      eventId: req.params.id as string,
      deletedAt: null,
      ...(user?.role === "ADMIN" ? {} : { userId: req.userId! }),
    },
    data: { body: "", deletedAt: new Date() },
  });
  if (!result.count)
    return res.status(403).json({ error: "You can't delete this comment" });
  res.json({ message: "Comment deleted" });
}
