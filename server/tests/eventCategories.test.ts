import { Request, Response } from "express";
import { createEvent, updateEvent, updateEventSchema, getAllEvents } from "../src/controllers/eventController";
import { updateEventAdmin } from "../src/controllers/adminController";
import { getMyStats } from "../src/controllers/userController";
import { getAllCategories } from "../src/controllers/categoryController";
import { validCategorySelection, categoryNames } from "../src/utils/eventCategories";
import prisma from "../src/prisma";

jest.mock("../src/prisma", () => ({ __esModule: true, default: {
  category: { count: jest.fn(), findMany: jest.fn() },
  event: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
  registration: { findMany: jest.fn(), create: jest.fn() },
  user: { findUnique: jest.fn() }, follow: { findMany: jest.fn() },
} }));
jest.mock("../src/utils/ratings", () => ({ withEventRatings: jest.fn(async events => events) }));
const ids = [1, 2, 3, 4].map(n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`);
let req: Request;
let res: Response;
beforeEach(() => {
  jest.resetAllMocks();
  req = { userId: "owner", params: { id: "event" }, query: {}, body: { categoryIds: ids.slice(0, 3) } } as unknown as Request;
  res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  (prisma.event.findUnique as jest.Mock).mockResolvedValue({ id: "event", createdByUserId: "owner", date: new Date("2099-01-01") });
  (prisma.event.update as jest.Mock).mockResolvedValue({ id: "event" });
  (prisma.registration.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.category.count as jest.Mock).mockResolvedValue(3);
});
it.each([[], ids, [ids[0], ids[0]], ["invalid"]].map(categoryIds => ({ categoryIds })))("rejects empty, excessive, duplicate or invalid category IDs: %j", ({ categoryIds }) => {
  expect(updateEventSchema.safeParse({ categoryIds }).success).toBe(false);
});
it("rejects conflicting primary category inputs", () => {
  expect(updateEventSchema.safeParse({ categoryId: ids[1], categoryIds: ids.slice(0, 2) }).success).toBe(false);
});
it("keeps Other last in the category choices", async () => {
  (prisma.category.findMany as jest.Mock).mockResolvedValue([{ name: "Music" }, { name: "Other" }, { name: "Technology" }]);
  await getAllCategories(req, res);
  expect(res.json).toHaveBeenCalledWith([{ name: "Music" }, { name: "Technology" }, { name: "Other" }]);
});
it("rejects retired/custom and nonexistent categories", async () => {
  (prisma.category.count as jest.Mock).mockResolvedValue(2);
  expect(await validCategorySelection(ids.slice(0, 3))).toBe(false);
  expect(prisma.category.count).toHaveBeenCalledWith({ where: { isCustom: false, name: { in: [...categoryNames] }, id: { in: ids.slice(0, 3) } } });
});
it.each([updateEvent, updateEventAdmin])("atomically replaces categories and updates the main category", async action => {
  await action(req, res);
  expect(prisma.event.update).toHaveBeenCalledWith({ where: { id: "event" }, data: { categoryId: ids[0], categories: { set: ids.slice(0, 3).map(id => ({ id })) } } });
});
it.each([updateEvent, updateEventAdmin])("preserves categories during an unrelated partial edit", async action => {
  req.body = { name: "Renamed event" };
  await action(req, res);
  expect(prisma.event.update).toHaveBeenCalledWith({ where: { id: "event" }, data: { name: "Renamed event" } });
  expect(prisma.category.count).not.toHaveBeenCalled();
});
it("requires at least one category on creation", async () => {
  req.body = { name: "Meetup", date: "2099-01-01T12:00:00.000Z", location: "Park", latitude: 1, longitude: 2 };
  await createEvent(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(prisma.event.create).not.toHaveBeenCalled();
});
it("filters events by any selected category", async () => {
  req.query = { categoryId: ids[1] };
  (prisma.event.findMany as jest.Mock).mockResolvedValue([]);
  await getAllEvents(req, res);
  expect(prisma.event.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { AND: expect.arrayContaining([{ OR: [{ categoryId: ids[1] }, { categories: { some: { id: ids[1] } } }] }]) } }));
});
it("copies every selected category into a recurring instance", async () => {
  (prisma.event.findMany as jest.Mock).mockResolvedValueOnce([{ id: "parent", categoryId: ids[0], categories: ids.slice(0, 3).map(id => ({ id })), date: new Date(Date.now() - 86400000), recurrencePattern: "DAILY" }]).mockResolvedValueOnce([]);
  await getAllEvents(req, res);
  expect(prisma.event.create).toHaveBeenCalledWith({ data: expect.objectContaining({ categoryId: ids[0], categories: { connect: ids.slice(0, 3).map(id => ({ id })) }, parentEventId: "parent" }) });
});
it("counts every selected category while counting attended events once", async () => {
  const a = { id: ids[0], name: "Music" }, b = { id: ids[1], name: "Arts & Culture" };
  (prisma.registration.findMany as jest.Mock).mockResolvedValue([{ event: { categoryId: a.id, category: a, categories: [a, b] } }, { event: { categoryId: b.id, category: b, categories: [b] } }]);
  await getMyStats(req, res);
  expect(res.json).toHaveBeenCalledWith({ totalEvents: 2, categoryCounts: [{ categoryId: b.id, name: b.name, count: 2 }, { categoryId: a.id, name: a.name, count: 1 }], topCategory: { categoryId: b.id, name: b.name, count: 2 } });
});
