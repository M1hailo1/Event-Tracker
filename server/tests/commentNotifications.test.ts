import { notifyComment } from "../src/utils/notifyComment";
import { userCanViewEvent } from "../src/controllers/eventController";
import { Prisma } from "@prisma/client";

jest.mock("../src/controllers/eventController", () => ({ userCanViewEvent: jest.fn() }));
const event = { id: "event", name: "Test event", createdByUserId: "organizer" };
let tx: Prisma.TransactionClient;
let upsert: jest.Mock;
beforeEach(() => {
  jest.resetAllMocks();
  upsert = jest.fn();
  tx = { event: { findUniqueOrThrow: jest.fn().mockResolvedValue(event) },
    eventComment: { findUnique: jest.fn().mockResolvedValue({ id: "thread", userId: "author" }) },
    notification: { upsert } } as unknown as Prisma.TransactionClient;
  (userCanViewEvent as jest.Mock).mockResolvedValue(true);
});
it("groups organizer notifications by event and increments their activity", async () => {
  await notifyComment(tx, { id: "latest-comment", eventId: "event", parentId: null, userId: "visitor" });
  const args = upsert.mock.calls[0][0];
  expect(args.create.userId).toBe("organizer");
  expect(args.create.type).toBe("EVENT_COMMENT");
  expect(args.create.commentId).toBe("latest-comment");
  expect(args.update.commentId).toBe("latest-comment");
  expect(args.where.groupKey).toBe(args.create.groupKey);
  expect(args.update.activityCount).toEqual({ increment: 1 });
});
it("sends replies to the original comment author and groups by thread", async () => {
  await notifyComment(tx, { id: "latest-comment", eventId: "event", parentId: "thread", userId: "visitor" });
  const args = upsert.mock.calls[0][0];
  expect(args.create.userId).toBe("author");
  expect(args.create.type).toBe("COMMENT_REPLY");
  expect(args.where.groupKey).toContain("thread");
});
it.each([{ parentId: null, userId: "organizer" }, { parentId: "thread", userId: "author" }])("does not notify someone about their own action", async comment => {
  await notifyComment(tx, { id: "latest-comment", eventId: "event", ...comment });
  expect(upsert).not.toHaveBeenCalled();
});
it("does not notify a recipient who lost access to the event", async () => {
  (userCanViewEvent as jest.Mock).mockResolvedValue(false);
  await notifyComment(tx, { id: "latest-comment", eventId: "event", parentId: "thread", userId: "visitor" });
  expect(upsert).not.toHaveBeenCalled();
});
