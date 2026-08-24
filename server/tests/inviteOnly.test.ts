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

describe("Invite-only events", () => {
  let organizerToken: string;
  let organizerId: string;
  let invitedToken: string;
  let invitedId: string;
  let categoryId: string;
  let eventId: string;

  const emailOrg = uniqueEmail("invOrg");
  const emailInvited = uniqueEmail("invUser");

  beforeAll(async () => {
    const org = await registerUser("Organizator Invite", emailOrg);
    const invited = await registerUser("Pozvani Korisnik", emailInvited);
    organizerToken = org.token;
    organizerId = org.userId;
    invitedToken = invited.token;
    invitedId = invited.userId;

    const category = await prisma.category.create({
      data: { name: `Invite category ${Date.now()}` },
    });
    categoryId = category.id;

    const eventRes = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        name: "Privatan dogadjaj",
        categoryId,
        date: new Date(Date.now() + 86400000).toISOString(),
        location: "Novi Sad",
        latitude: 45.25,
        longitude: 19.83,
        visibility: "INVITE_ONLY",
      });
    eventId = eventRes.body.id;
  });

  afterAll(async () => {
    await prisma.registration.deleteMany({ where: { eventId } });
    await prisma.eventInvite.deleteMany({ where: { eventId } });
    await prisma.notification.deleteMany({
      where: { userId: { in: [organizerId, invitedId] } },
    });
    await prisma.follow.deleteMany({
      where: { followerId: invitedId, followingId: organizerId },
    });
    await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({
      where: { email: { in: [emailOrg, emailInvited] } },
    });
    await prisma.$disconnect();
  });

  it("shouldnt allow uninvited user to join INVITE_ONLY event", async () => {
    const res = await request(app)
      .post(`/events/${eventId}/register`)
      .set("Authorization", `Bearer ${invitedToken}`);

    expect(res.status).toBe(403);
  });

  it("shouldnt allow the invitation of user who doesnt follow the creator", async () => {
    const res = await request(app)
      .post(`/events/${eventId}/invites`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({ userId: invitedId });

    expect(res.status).toBe(400);
  });

  it("should allow invitation when the user follows the creator", async () => {
    await request(app)
      .post(`/users/${organizerId}/follow`)
      .set("Authorization", `Bearer ${invitedToken}`);

    const res = await request(app)
      .post(`/events/${eventId}/invites`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({ userId: invitedId });

    expect(res.status).toBe(201);
  });

  it("should allow the user to join after hes been invited", async () => {
    const res = await request(app)
      .post(`/events/${eventId}/register`)
      .set("Authorization", `Bearer ${invitedToken}`);

    expect(res.status).toBe(201);
  });
});
