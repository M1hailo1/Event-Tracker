import { updateEventSchema } from "../src/controllers/eventController";
import { Request, Response, NextFunction } from "express";
import { requireAdmin, requireStaff } from "../src/middleware/authMiddleware";
import { setModeratorRole, banUserAdmin, unbanUserAdmin, deleteUserAdmin } from "../src/controllers/adminController";
import prisma from "../src/prisma";

jest.mock("../src/prisma", () => ({ __esModule: true, default: {
  $transaction: jest.fn(), $queryRaw: jest.fn(),
  user: { findUnique: jest.fn(), updateMany: jest.fn() },
} }));
jest.mock("../src/utils/auditHistory", () => ({ recordAudit: jest.fn() }));
let req: Request;
let res: Response;
let next: jest.Mock;
beforeEach(() => {
  jest.resetAllMocks();
  (prisma.$transaction as jest.Mock).mockImplementation(callback => callback(prisma));
  req = { userId: "actor", params: { id: "target" }, body: { role: "MODERATOR" } } as unknown as Request;
  res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  next = jest.fn();
});
it.each(["ADMIN", "MODERATOR"])("allows %s to use staff tools", async role => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role });
  await requireStaff(req, res, next as NextFunction);
  expect(next).toHaveBeenCalled();
});
it.each(["USER", "MODERATOR"])("denies %s access to role management", async role => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role });
  await requireAdmin(req, res, next as NextFunction);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});
it("denies regular users staff access", async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "USER" });
  await requireStaff(req, res, next as NextFunction);
  expect(res.status).toHaveBeenCalledWith(403);
});
it("checks current database permissions on every request", async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ role: "MODERATOR" }).mockResolvedValueOnce({ role: "USER" });
  await requireStaff(req, res, next as NextFunction);
  next.mockClear();
  await requireStaff(req, res, next as NextFunction);
  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(403);
});
it.each(["USER", "MODERATOR"])("sets %s only on non-admin accounts", async role => {
  req.body.role = role;
  (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "target", role });
  await setModeratorRole(req, res);
  expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "target", role: { in: ["USER", "MODERATOR"] } }, data: { role } });
  expect(res.json).toHaveBeenCalledWith({ id: "target", role });
});
it.each(["ADMIN", "INVALID"])("rejects assigning %s", async role => {
  req.body.role = role;
  await setModeratorRole(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(prisma.user.updateMany).not.toHaveBeenCalled();
});
it("protects admin roles from demotion", async () => {
  (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "target" });
  await setModeratorRole(req, res);
  expect(res.status).toHaveBeenCalledWith(403);
});
it("returns 404 for missing targets", async () => {
  (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
  await setModeratorRole(req, res);
  expect(res.status).toHaveBeenCalledWith(404);
});

it.each([banUserAdmin, unbanUserAdmin, deleteUserAdmin])("prevents moderators from managing admin accounts", async action => {
  req.body = { duration: "1h" };
  (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: "target", role: "ADMIN" }).mockResolvedValueOnce({ role: "MODERATOR" });
  await action(req, res);
  expect(res.status).toHaveBeenCalledWith(403);
});

it("preserves event visibility and recurrence when a staff edit omits them", () => {
  expect(updateEventSchema.parse({ name: "Renamed event" })).toEqual({ name: "Renamed event" });
});
