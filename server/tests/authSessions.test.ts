import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { requireAuth } from "../src/middleware/authMiddleware";
import { generateToken } from "../src/utils/jwt";
import prisma from "../src/prisma";

jest.mock("../src/prisma", () => ({ __esModule: true, default: { user: { findUnique: jest.fn() } } }));
const app = express();
app.get("/protected", requireAuth, (_req, res) => res.json({ ok: true }));
beforeEach(() => jest.resetAllMocks());

it("reports temporary database failure as 503 instead of invalidating a valid token", async () => {
  (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("Database unavailable"));
  const result = await request(app).get("/protected").set("Authorization", `Bearer ${generateToken("viewer")}`);
  expect(result.status).toBe(503);
  expect(result.body.error).toMatch(/temporarily unavailable/);
});

it("returns 401 for deleted accounts", async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
  expect((await request(app).get("/protected").set("Authorization", `Bearer ${generateToken("deleted")}`)).status).toBe(401);
});

it("rejects expired tokens before querying the database", async () => {
  const token = jwt.sign({ userId: "viewer" }, process.env.JWT_SECRET!, { expiresIn: -1 });
  expect((await request(app).get("/protected").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  expect(prisma.user.findUnique).not.toHaveBeenCalled();
});

it("preserves the distinction between banned and unauthenticated users", async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "viewer", role: "USER", bannedUntil: new Date(Date.now() + 60000), banReason: null });
  expect((await request(app).get("/protected").set("Authorization", `Bearer ${generateToken("viewer")}`)).status).toBe(403);
});
