import request from "supertest";
import app from "../src/app";
import prisma from "../src/prisma";

const uniqueEmail = (label: string) =>
  `test_${label}_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

async function registerUser(name: string, email: string) {
  const res = await request(app).post("/auth/register").send({
    name,
    email,
    password: "SigurnaLozinka123!",
  });
  return {
    token: res.body.token as string,
    userId: res.body.user.id as string,
  };
}

describe("Follow system (/users/:userId/follow)", () => {
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;
  const emailA = uniqueEmail("followA");
  const emailB = uniqueEmail("followB");

  beforeAll(async () => {
    const a = await registerUser("Korisnik A", emailA);
    const b = await registerUser("Korisnik B", emailB);
    userAToken = a.token;
    userAId = a.userId;
    userBToken = b.token;
    userBId = b.userId;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
    await prisma.follow.deleteMany({
      where: { OR: [{ followerId: userAId }, { followerId: userBId }] },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await prisma.$disconnect();
  });

  it("shouldnt allow user to follow themselves", async () => {
    const res = await request(app)
      .post(`/users/${userAId}/follow`)
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(400);
  });

  it("should allow one user to follow another", async () => {
    const res = await request(app)
      .post(`/users/${userBId}/follow`)
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(201);
  });

  it("shouldnt allow the doubled following of a user", async () => {
    const res = await request(app)
      .post(`/users/${userBId}/follow`)
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(409);
  });

  it("should show the first user in the list of followers of the second user", async () => {
    const res = await request(app).get(`/users/${userBId}/followers`);
    expect(res.status).toBe(200);
    const ids = res.body.map((u: any) => u.id);
    expect(ids).toContain(userAId);
  });

  it("should allow unfollowing", async () => {
    const res = await request(app)
      .delete(`/users/${userBId}/follow`)
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
  });
});
