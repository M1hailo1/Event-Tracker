import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import prisma from "../src/prisma";
import { generateToken } from "../src/utils/jwt";
import { requireAuth } from "../src/middleware/authMiddleware";
import { resolveRateLimitIdentity } from "../src/middleware/rateLimitIdentity";
import { createActionLimiter, createGeneralLimiter } from "../src/middleware/rateLimiters";

jest.mock("../src/prisma", () => ({ __esModule: true, default: { user: { findUnique: jest.fn() } } }));
const originalEnv = process.env.NODE_ENV;
beforeEach(() => {
  process.env.NODE_ENV = "development";
  jest.resetAllMocks();
});
afterEach(() => { process.env.NODE_ENV = originalEnv; });

function identity(role: string, bannedUntil: Date | null = null) {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "actor", role, bannedUntil, banReason: null });
}
function appFor(action = false) {
  const app = express();
  app.use(resolveRateLimitIdentity);
  if (action) app.use(requireAuth, createActionLimiter(1, "test actions"));
  else app.use(createGeneralLimiter(1));
  app.get("/", (_req, res) => { res.sendStatus(200); });
  return app;
}

describe.each([false, true])("role limits (action=%s)", action => {
  it.each([["USER", 1], ["MODERATOR", 3], ["ADMIN", 5]] as const)("enforces %s allowance", async (role, allowance) => {
    identity(role);
    const app = appFor(action);
    const token = generateToken("actor");
    for (let i = 0; i < allowance; i++) {
      expect((await request(app).get("/").auth(token, { type: "bearer" })).status).toBe(200);
    }
    expect((await request(app).get("/").auth(token, { type: "bearer" })).status).toBe(429);
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(allowance + 1);
  });
  it("uses a revoked role immediately with the same token", async () => {
    identity("ADMIN");
    const app = appFor(action);
    const token = generateToken("actor");
    expect((await request(app).get("/").auth(token, { type: "bearer" })).status).toBe(200);
    identity("USER");
    expect((await request(app).get("/").auth(token, { type: "bearer" })).status).toBe(429);
  });
});

it("ignores a token role claim and client role header", async () => {
  identity("USER");
  const app = appFor();
  const token = jwt.sign({ userId: "actor", role: "ADMIN" }, process.env.JWT_SECRET!);
  expect((await request(app).get("/").auth(token, { type: "bearer" }).set("x-role", "ADMIN")).status).toBe(200);
  expect((await request(app).get("/").auth(token, { type: "bearer" })).status).toBe(429);
});
it("does not grant banned staff extra requests", async () => {
  identity("ADMIN", new Date(Date.now() + 60000));
  const app = appFor();
  const token = generateToken("actor");
  expect((await request(app).get("/").auth(token, { type: "bearer" })).status).toBe(200);
  expect((await request(app).get("/").auth(token, { type: "bearer" })).status).toBe(429);
});
it("invalid tokens share the anonymous IP quota without a database lookup", async () => {
  const app = appFor();
  expect((await request(app).get("/").auth("invalid", { type: "bearer" })).status).toBe(200);
  expect((await request(app).get("/")).status).toBe(429);
  expect(prisma.user.findUnique).not.toHaveBeenCalled();
});
it("database lookup failures never grant staff quotas", async () => {
  (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("unavailable"));
  const app = appFor();
  const token = generateToken("actor");
  expect((await request(app).get("/").auth(token, { type: "bearer" })).status).toBe(200);
  expect((await request(app).get("/").auth(token, { type: "bearer" })).status).toBe(429);
});
