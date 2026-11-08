import request from "supertest";
import app from "../src/app";
import prisma from "../src/prisma";
import { generateToken } from "../src/utils/jwt";

describe("Public sitemap eligibility", () => {
  afterAll(async () => { await prisma.$disconnect(); });
  test("only future real public events from unbanned organizers are exposed, regardless of caller", async () => {
    const owner = await prisma.user.create({ data: { name: "SEO Fixture", email: "seo-owner@example.test" } });
    const staff = await prisma.user.create({ data: { name: "SEO Staff", email: "seo-staff@example.test", role: "ADMIN" } });
    const category = await prisma.category.findFirstOrThrow();
    const create = (name: string, extra = {}) => prisma.event.create({ data: { name, categoryId: category.id, createdByUserId: owner.id, date: new Date("2099-01-01"), location: "Fictional venue", latitude: 1, longitude: 2, ...extra } });
    const real = await create("Public fixture");
    const described = await create("Described public fixture", { description: "A community gathering" });
    const excluded = await Promise.all([
      create("[DEMO] Fictional"), create("Demo description", { description: "NOT A REAL EVENT" }),
      create("Other demo description", { description: "DEMONSTRATION ONLY" }),
      create("Private", { visibility: "INVITE_ONLY" }), create("Followers", { visibility: "FOLLOWERS_ONLY" }),
      create("Ended", { date: new Date("2000-01-01") }), create("Cancelled", { cancelledAt: new Date() }),
    ]);
    for (const token of [null, generateToken(owner.id), generateToken(staff.id)]) {
      const req = request(app).get("/seo/events");
      if (token) req.set("Authorization", `Bearer ${token}`);
      const response = await req.expect(200);
      expect(response.body).toEqual(expect.arrayContaining([{ id: real.id }, { id: described.id }]));
      for (const event of excluded) expect(response.body).not.toContainEqual({ id: event.id });
      expect(response.body.every((event: Record<string, unknown>) => Object.keys(event).join() === "id")).toBe(true);
      expect(response.headers["cache-control"]).toBe("no-store");
    }
    await prisma.user.update({ where: { id: owner.id }, data: { bannedUntil: new Date("2099-01-01") } });
    const banned = await request(app).get("/seo/events").expect(200);
    expect(banned.body).not.toContainEqual({ id: real.id });
  });
});
