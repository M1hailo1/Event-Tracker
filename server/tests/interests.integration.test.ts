import request from "supertest";
import app from "../src/app";
import prisma from "../src/prisma";
import { generateToken } from "../src/utils/jwt";

describe("Interests and personal discovery", () => {
  let viewer: string, owner: string, music: string, film: string;
  let token: string;
  beforeAll(async () => {
    const users = await Promise.all(["viewer", "owner"].map(name => prisma.user.create({ data: { name, email: `interests-${name}@example.test` } })));
    [viewer, owner] = users.map(user => user.id);
    token = `Bearer ${generateToken(viewer)}`;
    music = (await prisma.category.findFirstOrThrow({ where: { name: "Music", isCustom: false } })).id;
    film = (await prisma.category.findFirstOrThrow({ where: { name: "Film", isCustom: false } })).id;
  });
  afterAll(async () => { await prisma.$disconnect(); });
  const dashboard = () => request(app).get("/users/me/dashboard").set("Authorization", token);
  const save = (categoryIds: unknown) => request(app).put("/users/me/interests").set("Authorization", token).send({ categoryIds });
  async function event(name: string, categoryId = music, extra = {}) {
    return prisma.event.create({ data: { name, categoryId, categories: { connect: { id: categoryId } }, createdByUserId: owner, date: new Date("2099-01-01"), location: "Fictional venue", latitude: 1, longitude: 2, ...extra } });
  }
  test("private authenticated selections validate, persist, replace and clear", async () => {
    await request(app).get("/users/me/interests").expect(401);
    await request(app).put("/users/me/interests").send({ categoryIds: [] }).expect(401);
    for (const invalid of [[music, music], ["invalid"], ["00000000-0000-4000-8000-000000000000"], "Music"]) expect((await save(invalid)).status).toBe(400);
    expect((await save([music])).status).toBe(200);
    expect((await request(app).get("/users/me/interests").set("Authorization", token)).body.map((category: { id: string }) => category.id)).toEqual([music]);
    expect((await request(app).get(`/users/${viewer}`)).body).not.toHaveProperty("interests");
    await save([film]).expect(200);
    expect((await save([])).body).toEqual([]);
  });
  test("recommendations and exploration enforce eligibility, access and disjoint categories", async () => {
    await save([music]);
    const match = await event("Interest match");
    const explore = await event("Explore film", film);
    const hidden = await Promise.all([
      event("Private", music, { visibility: "INVITE_ONLY" }),
      event("Followers", music, { visibility: "FOLLOWERS_ONLY" }),
      event("Cancelled", music, { cancelledAt: new Date() }),
      event("Started", music, { date: new Date("2000-01-01"), endDate: new Date("2099-01-02") }),
      event("Own", music, { createdByUserId: viewer }),
      event("Joined"),
    ]);
    await prisma.registration.create({ data: { userId: viewer, eventId: hidden[5].id, status: "CONFIRMED" } });
    let result = await dashboard();
    expect(result.status).toBe(200);
    expect(result.body.recommendedEvents.map((item: { id: string }) => item.id)).toContain(match.id);
    expect(result.body.exploreEvents.map((item: { id: string }) => item.id)).toContain(explore.id);
    const ids = [...result.body.recommendedEvents, ...result.body.exploreEvents].map(item => item.id);
    for (const item of hidden) expect(ids).not.toContain(item.id);
    await prisma.follow.create({ data: { followerId: viewer, followingId: owner } });
    await prisma.eventInvite.create({ data: { eventId: hidden[0].id, invitedUserId: viewer } });
    result = await dashboard();
    expect(result.body.recommendedEvents.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining([hidden[0].id, hidden[1].id]));
    await prisma.user.update({ where: { id: owner }, data: { bannedUntil: new Date("2099-01-01") } });
    result = await dashboard();
    expect(result.body.recommendedEvents).toEqual([]);
    expect(result.body.exploreEvents).toEqual([]);
    await prisma.user.update({ where: { id: owner }, data: { bannedUntil: null } });
  });
  test("activity works without selected interests and a new account gets exploration", async () => {
    await save([]);
    const saved = await event("Saved film signal", film);
    await prisma.savedEvent.create({ data: { userId: viewer, eventId: saved.id } });
    const result = await dashboard();
    const filmMatch = result.body.recommendedEvents.find((item: { id: string }) => item.id === saved.id);
    expect(filmMatch.recommendationReason).toBe("Similar to Film events you've saved");
    const freshToken = `Bearer ${generateToken(owner)}`;
    const fresh = await request(app).get("/users/me/dashboard").set("Authorization", freshToken);
    expect(fresh.body.recommendedEvents).toEqual([]);
    expect(fresh.body.exploreEvents.length).toBeGreaterThan(0);
  });
});
