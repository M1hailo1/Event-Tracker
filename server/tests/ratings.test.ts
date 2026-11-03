import { Request, Response } from "express";
import { rateEvent } from "../src/controllers/ratingController";
import prisma from "../src/prisma";
import { userCanViewEvent } from "../src/controllers/eventController";

jest.mock("../src/prisma", () => ({ __esModule: true, default: {
  $transaction: jest.fn(), $queryRaw: jest.fn(),
  notification: { deleteMany: jest.fn() },
  event: { findUnique: jest.fn() },
  registration: { findUnique: jest.fn() },
  eventRating: { upsert: jest.fn() },
} }));
jest.mock("../src/controllers/eventController", () => ({ userCanViewEvent: jest.fn() }));

const event = { id: "event", createdByUserId: "organizer", date: new Date(0), endDate: null };
let req: Request;
let res: Response;
beforeEach(() => {
  jest.resetAllMocks();
  (prisma.$transaction as jest.Mock).mockImplementation(callback => callback(prisma));
  req = { params: { id: "event" }, userId: "attendee", body: { score: 4 } } as unknown as Request;
  res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response;
  (prisma.event.findUnique as jest.Mock).mockResolvedValue(event);
  (userCanViewEvent as jest.Mock).mockResolvedValue(true);
  (prisma.registration.findUnique as jest.Mock).mockResolvedValue({ status: "CONFIRMED" });
  (prisma.eventRating.upsert as jest.Mock).mockResolvedValue({ score: 4 });
});

it.each([0, 6, 2.5, "5", null])("rejects invalid score %p", async score => {
  req.body.score = score;
  await rateEvent(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(prisma.eventRating.upsert).not.toHaveBeenCalled();
});
it("rejects an organizer rating their own event", async () => {
  req.userId = "organizer";
  await rateEvent(req, res);
  expect(res.status).toHaveBeenCalledWith(403);
});
it("waits until the end date even if the event has started", async () => {
  (prisma.event.findUnique as jest.Mock).mockResolvedValue({ ...event, endDate: new Date(Date.now() + 86400000) });
  await rateEvent(req, res);
  expect(res.status).toHaveBeenCalledWith(403);
});
it.each([null, { status: "PENDING" }, { status: "CANCELLED" }])("rejects ineligible registration %p", async registration => {
  (prisma.registration.findUnique as jest.Mock).mockResolvedValue(registration);
  await rateEvent(req, res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(prisma.eventRating.upsert).not.toHaveBeenCalled();
});
it("enforces event visibility", async () => {
  (userCanViewEvent as jest.Mock).mockResolvedValue(false);
  await rateEvent(req, res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(prisma.eventRating.upsert).not.toHaveBeenCalled();
});
it("creates or updates one rating per attendee and event", async () => {
  await rateEvent(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(prisma.eventRating.upsert).toHaveBeenCalledWith({
    where: { userId_eventId: { userId: "attendee", eventId: "event" } },
    create: { userId: "attendee", eventId: "event", score: 4 },
    update: { score: 4 },
  });
});
