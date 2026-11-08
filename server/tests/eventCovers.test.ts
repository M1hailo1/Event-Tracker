import { Request, Response } from "express";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { baseEventSchema, updateEventSchema, createEvent, updateEvent, getAllEvents } from "../src/controllers/eventController";
import { updateEventAdmin } from "../src/controllers/adminController";
import { eventCoverIds } from "../src/utils/eventCovers";
import prisma from "../src/prisma";

jest.mock("../src/prisma", () => ({ __esModule: true, default: {
  $transaction: jest.fn(), $queryRaw: jest.fn(),
  event: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), findMany: jest.fn() },
  registration: { create: jest.fn(), findMany: jest.fn() },
  user: { findUnique: jest.fn() }, follow: { findMany: jest.fn() },
  category: { count: jest.fn() },
} }));
jest.mock("../src/utils/auditHistory", () => ({ recordAudit: jest.fn() }));
jest.mock("../src/utils/ratings", () => ({ withEventRatings: jest.fn(async events => events) }));
let req: Request;
let res: Response;
beforeEach(() => {
  jest.resetAllMocks();
  (prisma.event.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "event", categories: [], date: new Date("2099-01-01"), endDate: null });
  (prisma.$transaction as jest.Mock).mockImplementation(callback => callback(prisma));
  (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 'parent', parentEventId: null }]);
  req = { userId: "owner", params: { id: "event" }, query: {}, body: { coverId: "music-live" } } as unknown as Request;
  res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  (prisma.event.findUnique as jest.Mock).mockResolvedValue({ id: "event", createdByUserId: "owner", date: new Date("2099-01-01") });
  (prisma.event.update as jest.Mock).mockResolvedValue({ id: "event" });
  (prisma.registration.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.category.count as jest.Mock).mockResolvedValue(1);
});
it("accepts curated IDs and explicit removal, preserving omitted covers", () => {
  for (const coverId of eventCoverIds) expect(updateEventSchema.parse({ coverId })).toEqual({ coverId });
  expect(updateEventSchema.parse({ coverId: null })).toEqual({ coverId: null });
  expect(updateEventSchema.parse({ name: "Renamed" })).toEqual({ name: "Renamed" });
});
it.each(["https://example.com/image.jpg", "../../image", "unknown", "", 5])("rejects an arbitrary cover %s", coverId => {
  expect(baseEventSchema.shape.coverId.safeParse(coverId).success).toBe(false);
});
it.each([updateEvent, updateEventAdmin])("saves and removes covers through event editing", async action => {
  await action(req, res);
  expect(prisma.event.update).toHaveBeenLastCalledWith({ where: { id: "event" }, data: { coverId: "music-live" } });
  req.body = { coverId: null };
  await action(req, res);
  expect(prisma.event.update).toHaveBeenLastCalledWith({ where: { id: "event" }, data: { coverId: null } });
});
it("persists the selected cover when creating an event", async () => {
  req.body = { name: "Music meetup", categoryId: "11111111-1111-4111-8111-111111111111", date: "2099-01-01T12:00:00.000Z", location: "Park", latitude: 1, longitude: 2, coverId: "music-live", visibility: "INVITE_ONLY" };
  (prisma.event.create as jest.Mock).mockResolvedValue({ id: "event" });
  await createEvent(req, res);
  expect(prisma.event.create).toHaveBeenCalledWith({ data: expect.objectContaining({ coverId: "music-live" }) });
  expect(res.status).toHaveBeenCalledWith(201);
});
it("keeps the cover on the next recurring event instance", async () => {
  (prisma.event.findUnique as jest.Mock).mockResolvedValue({ id: "parent", date: new Date(Date.now() - 86400000), recurrencePattern: "DAILY", coverId: "music-dj", nextInstances: [] });
  (prisma.event.findMany as jest.Mock).mockResolvedValueOnce([{ id: "parent", date: new Date(Date.now() - 86400000), recurrencePattern: "DAILY", coverId: "music-dj" }]).mockResolvedValueOnce([]);
  await getAllEvents(req, res);
  expect(prisma.event.create).toHaveBeenCalledWith({ data: expect.objectContaining({ coverId: "music-dj", parentEventId: "parent" }) });
});
it("keeps the frontend collection and bundled assets in sync with accepted IDs", () => {
  const catalog = readFileSync(resolve(__dirname, "../../client/src/data/eventCovers.ts"), "utf8");
  expect([...catalog.matchAll(/"id": "([^"]+)"/g)].map(match => match[1])).toEqual([...eventCoverIds]);
  for (const id of eventCoverIds) expect(existsSync(resolve(__dirname, `../../client/public/event-covers/${id}.webp`))).toBe(true);
});
