import request from "supertest";
import app from "../src/app";
import prisma from "../src/prisma";

const uniqueEmail = () =>
  `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

describe("Authentification (/auth)", () => {
  const password = "SigurnaLozinka123!";
  let testEmail: string;

  beforeAll(() => {
    testEmail = uniqueEmail();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it("should register a new user and return a token", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "Test Korisnik",
      email: testEmail,
      password,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(testEmail);
  });

  it("shouldnt be able to register with an existing email", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "Test Korisnik 2",
      email: testEmail,
      password,
    });

    expect(res.status).toBe(409);
  });

  it("shouldnt allow login with wrong password", async () => {
    const res = await request(app).post("/auth/login").send({
      email: testEmail,
      password: "PogresnaLozinka",
    });

    expect(res.status).toBe(401);
  });

  it("should allow login with correct data", async () => {
    const res = await request(app).post("/auth/login").send({
      email: testEmail,
      password,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("shouldnt allow access to a protected route without a token", async () => {
    const res = await request(app).get("/users/me");
    expect(res.status).toBe(401);
  });
});
