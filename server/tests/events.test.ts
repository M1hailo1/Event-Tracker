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

describe("Events and capacity (/events)", () => {
  let organizerToken: string;
  let organizerId: string;
  let categoryId: string;
  let eventId: string;
  const organizerEmail = uniqueEmail("org");
  const otherEmails: string[] = [];

  beforeAll(async () => {
    const organizer = await registerUser("Organizator", organizerEmail);
    organizerToken = organizer.token;
    organizerId = organizer.userId;

    const category = await prisma.category.create({
      data: { name: `Test Category ${Date.now()}` },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await prisma.registration.deleteMany({ where: { eventId } });
    await prisma.notification.deleteMany({
      where: {
        userId: { in: [organizerId, ...(otherEmails.length ? [] : [])] },
      },
    });
    await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({
      where: { email: { in: [organizerEmail, ...otherEmails] } },
    });
    await prisma.$disconnect();
  });

  it("shouldnt allow creation of events without logging in", async () => {
    const res = await request(app)
      .post("/events")
      .send({
        name: "Neautorizovan dogadjaj",
        categoryId,
        date: new Date(Date.now() + 86400000).toISOString(),
        location: "Beograd",
        latitude: 44.8,
        longitude: 20.5,
      });

    expect(res.status).toBe(401);
  });

  it("should create a new event as a registered user", async () => {
    const res = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        name: "Test dogadjaj",
        categoryId,
        date: new Date(Date.now() + 86400000).toISOString(),
        location: "Beograd",
        latitude: 44.8,
        longitude: 20.5,
        maxCapacity: 2,
        visibility: "PUBLIC",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    eventId = res.body.id;
  });

  it("should show the new event in the event list", async () => {
    const res = await request(app).get("/events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("shouldnt allow editing of event to a user that did not create it", async () => {
    const otherEmail = uniqueEmail("other");
    otherEmails.push(otherEmail);
    const other = await registerUser("Drugi korisnik", otherEmail);

    const res = await request(app)
      .put(`/events/${eventId}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ name: "Pokusaj izmene" });

    expect(res.status).toBe(403);
  });

  it("should respect the EVENT_FULL rule", async () => {
    const email1 = uniqueEmail("cap1");
    const email2 = uniqueEmail("cap2");
    otherEmails.push(email1, email2);
    const user1 = await registerUser("Prvi ucesnik", email1);
    const user2 = await registerUser("Drugi ucesnik", email2);

    const first = await request(app)
      .post(`/events/${eventId}/register`)
      .set("Authorization", `Bearer ${user1.token}`);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/events/${eventId}/register`)
      .set("Authorization", `Bearer ${user2.token}`);
    expect(second.status).toBe(409);
    expect(JSON.stringify(second.body)).toMatch(/full/i);
  });
});
