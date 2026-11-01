import { Request, Response, NextFunction } from "express";
import { requireCommentAccess, createComment, updateComment, deleteComment, getComments } from "../src/controllers/commentController";
import prisma from "../src/prisma";
import { userCanViewEvent } from "../src/controllers/eventController";

jest.mock("../src/prisma", () => ({ __esModule: true, default: {
  event: { findUnique: jest.fn() }, user: { findUnique: jest.fn() },
  eventComment: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
} }));
jest.mock("../src/controllers/eventController", () => ({ userCanViewEvent: jest.fn() }));
let req: Request;
let res: Response;
beforeEach(() => {
  jest.resetAllMocks();
  req = { params: { id: "event", commentId: "comment" }, query: {}, userId: "author", body: { body: "Hello" } } as unknown as Request;
  res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response;
});
it("denies reading comments on an inaccessible event", async () => {
  (prisma.event.findUnique as jest.Mock).mockResolvedValue({ id: "event" });
  (userCanViewEvent as jest.Mock).mockResolvedValue(false);
  const next = jest.fn();
  await requireCommentAccess(req, res, next as NextFunction);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});
it.each(["", "   ", "a".repeat(2001)])("rejects empty or oversized text", async body => {
  req.body.body = body;
  await createComment(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(prisma.eventComment.create).not.toHaveBeenCalled();
});
it("rejects replies to replies, deleted comments, or another event's comment", async () => {
  req.body.parentId = "11111111-1111-4111-8111-111111111111";
  (prisma.eventComment.findFirst as jest.Mock).mockResolvedValue(null);
  await createComment(req, res);
  expect(prisma.eventComment.findFirst).toHaveBeenCalledWith({ where: {
    id: req.body.parentId, eventId: "event", parentId: null, deletedAt: null,
  } });
  expect(res.status).toHaveBeenCalledWith(400);
  expect(prisma.eventComment.create).not.toHaveBeenCalled();
});
it("scopes edits to the author and event", async () => {
  (prisma.eventComment.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
  await updateComment(req, res);
  expect(prisma.eventComment.updateMany).toHaveBeenCalledWith({
    where: { id: "comment", eventId: "event", userId: "author", deletedAt: null }, data: { body: "Hello" },
  });
  expect(res.status).toHaveBeenCalledWith(403);
});
it.each(["USER", "ADMIN"])("limits deletion appropriately for %s", async role => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role });
  (prisma.eventComment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  await deleteComment(req, res);
  const args = (prisma.eventComment.updateMany as jest.Mock).mock.calls[0][0];
  expect(args.where).toEqual({ id: "comment", eventId: "event", deletedAt: null, ...(role === "USER" ? { userId: "author" } : {}) });
  expect(args.data.body).toBe("");
  expect(args.data.deletedAt).toBeInstanceOf(Date);
});
it("paginates and redacts deleted comments", async () => {
  const rows = Array.from({ length: 21 }, (_, i) => ({ id: `comment-${i}`, body: "hidden", deletedAt: new Date(), user: { id: "author", name: "Name", role: "USER" } }));
  (prisma.eventComment.findMany as jest.Mock).mockResolvedValue(rows);
  await getComments(req, res);
  const page = (res.json as jest.Mock).mock.calls[0][0];
  expect(page.comments).toHaveLength(20);
  expect(page.nextCursor).toBe("comment-19");
  expect(page.comments[0].body).toBe("");
  expect(page.comments[0].user).toBeNull();
});
it("rejects a cursor outside the requested thread", async () => {
  req.query.cursor = "11111111-1111-4111-8111-111111111111";
  (prisma.eventComment.findFirst as jest.Mock).mockResolvedValue(null);
  await getComments(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(prisma.eventComment.findMany).not.toHaveBeenCalled();
});

it("filters deleted empty threads before applying the page limit", async () => {
  (prisma.eventComment.findMany as jest.Mock).mockResolvedValue([]);
  await getComments(req, res);
  expect((prisma.eventComment.findMany as jest.Mock).mock.calls[0][0].where.OR).toEqual([
    { deletedAt: null }, { replies: { some: { deletedAt: null } } },
  ]);
});
it("resolves a reply target to its root in the same event", async () => {
  req.query.targetId = "11111111-1111-4111-8111-111111111111";
  (prisma.eventComment.findFirst as jest.Mock)
    .mockResolvedValueOnce({ id: req.query.targetId, parentId: "root" })
    .mockResolvedValueOnce({ id: "root", deletedAt: new Date(), body: "", user: { id: "author", name: "Name", role: "USER" } });
  await getComments(req, res);
  expect((prisma.eventComment.findFirst as jest.Mock).mock.calls[1][0].where).toEqual({ id: "root", eventId: "event" });
  expect((res.json as jest.Mock).mock.calls[0][0].comments[0].id).toBe("root");
});
it("returns an unavailable message for a removed target", async () => {
  req.query.targetId = "11111111-1111-4111-8111-111111111111";
  (prisma.eventComment.findFirst as jest.Mock).mockResolvedValue(null);
  await getComments(req, res);
  expect(res.status).toHaveBeenCalledWith(404);
});
