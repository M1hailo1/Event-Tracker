import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/prisma";
import { generateToken } from "../src/utils/jwt";
import { sendDueEventReminders } from "../src/utils/eventReminders";

describe("Bulk event notifications", () => {
  const lastRecipient = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  const followerIds = [...Array.from({ length: 4999 }, () => randomUUID()), lastRecipient];
  let owner: string, staff: string, categoryId: string, ownerToken: string, staffToken: string;
  const payload = (name: string, visibility = "PUBLIC") => ({ name, visibility, categoryId, date: "2099-07-01T12:00:00Z", location: "Fictional venue", latitude: 1, longitude: 2 });
  const create = (name: string, visibility?: string) => request(app).post("/events").set("Authorization", ownerToken).send(payload(name, visibility));
  const event = (name: string) => prisma.event.create({ data: { name, createdByUserId: owner, categoryId,
    date: new Date("2099-07-01T12:00:00Z"), location: "Fictional venue", latitude: 1, longitude: 2,
    registrations: { create: [{ userId: owner, status: "CONFIRMED" }, { userId: lastRecipient, status: "CONFIRMED" }] },
  } });

  beforeAll(async () => {
    owner = (await prisma.user.create({ data: { name: "Bulk Organizer", email: "bulk-owner@example.test" } })).id;
    staff = (await prisma.user.create({ data: { name: "Bulk Staff", email: "bulk-staff@example.test", role: "ADMIN" } })).id;
    ownerToken = `Bearer ${generateToken(owner)}`;
    staffToken = `Bearer ${generateToken(staff)}`;
    categoryId = (await prisma.category.findFirstOrThrow({ where: { name: "Music", isCustom: false } })).id;
    await prisma.user.createMany({ data: followerIds.map((id, index) => ({ id, name: `Fictional Bulk Follower ${index}`, email: `bulk-follower-${index}@example.test` })) });
    await prisma.follow.createMany({ data: followerIds.map(id => ({ id: id === lastRecipient ? lastRecipient : randomUUID(), followerId: id, followingId: owner })) });
  });
  afterAll(async () => {
    try {
      if (owner) {
        await prisma.registration.deleteMany({ where: { event: { createdByUserId: owner } } });
        await prisma.eventInvite.deleteMany({ where: { event: { createdByUserId: owner } } });
        await prisma.event.deleteMany({ where: { createdByUserId: owner } });
        await prisma.notification.deleteMany({ where: { userId: { in: [...followerIds, owner] } } });
        await prisma.follow.deleteMany({ where: { followingId: owner } });
        await prisma.user.deleteMany({ where: { id: { in: followerIds } } });
      }
    } finally { await prisma.$disconnect(); }
  });

  test("delivers to 5,000 followers/attendees and skips invite-only creation notices", async () => {
    const started = performance.now();
    const response = await create("Bulk 5000 event").expect(201);
    console.info(`Local 5,000-follower creation + notifications: ${Math.round(performance.now() - started)} ms`);
    const rows = await prisma.notification.findMany({ where: { eventId: response.body.id, type: "NEW_EVENT_FROM_FOLLOWED" }, select: { userId: true } });
    expect(rows).toHaveLength(5000);
    expect(new Set(rows.map(row => row.userId))).toEqual(new Set(followerIds));
    expect(await prisma.registration.count({ where: { eventId: response.body.id } })).toBe(1);
    await prisma.registration.createMany({ data: followerIds.map(userId => ({ userId, eventId: response.body.id, status: "CONFIRMED" })) });
    await request(app).put(`/events/${response.body.id}`).set("Authorization", ownerToken).send({ name: "Bulk 5000 updated" }).expect(200);
    expect(await prisma.notification.count({ where: { eventId: response.body.id, type: "EVENT_UPDATED" } })).toBe(5000);
    await request(app).delete(`/events/${response.body.id}`).set("Authorization", ownerToken).expect(200);
    expect(await prisma.notification.count({ where: { eventId: null, type: "EVENT_CANCELLED", message: 'The event "Bulk 5000 updated" you were registered for was permanently deleted' } })).toBe(5000);
    for (const visibility of ["FOLLOWERS_ONLY", "INVITE_ONLY"]) {
      const created = await create(`Bulk ${visibility}`, visibility).expect(201);
      expect(await prisma.notification.count({ where: { eventId: created.body.id } })).toBe(visibility === "INVITE_ONLY" ? 0 : 5000);
    }
  });

  test("owner and staff edits/deletions preserve their existing recipients and deleted-event links", async () => {
    for (const isStaff of [false, true]) {
      const target = await event(`Bulk ${isStaff ? "staff" : "owner"} lifecycle`);
      const endpoint = `${isStaff ? "/admin" : ""}/events/${target.id}`;
      const token = isStaff ? staffToken : ownerToken;
      await request(app).put(endpoint).set("Authorization", token).send({ name: "Bulk renamed" }).expect(200);
      const updates = await prisma.notification.findMany({ where: { eventId: target.id, type: "EVENT_UPDATED" } });
      expect(new Set(updates.map(row => row.userId))).toEqual(new Set(isStaff ? [owner, lastRecipient] : [lastRecipient]));
      await request(app).delete(endpoint).set("Authorization", token).expect(200);
      const deleted = await prisma.notification.findMany({ where: { type: "EVENT_CANCELLED", eventId: null,
        userId: { in: [owner, lastRecipient] }, message: { contains: '"Bulk renamed"' } } });
      expect(deleted.some(row => row.userId === lastRecipient)).toBe(true);
      expect(await prisma.event.findUnique({ where: { id: target.id } })).toBeNull();
    }
  });

  test("failure in a later follower batch rolls back the event, organizer seat and earlier notification batches", async () => {
    const before = await prisma.notification.count({ where: { type: "NEW_EVENT_FROM_FOLLOWED", userId: { in: followerIds } } });
    await prisma.$executeRaw`ALTER TABLE "Notification" ADD CONSTRAINT "bulk_test_failure" CHECK ("userId" <> 'ffffffff-ffff-4fff-8fff-ffffffffffff') NOT VALID`;
    try {
      await create("Bulk failed creation").expect(500);
      expect(await prisma.event.count({ where: { name: "Bulk failed creation", createdByUserId: owner } })).toBe(0);
      expect(await prisma.notification.count({ where: { type: "NEW_EVENT_FROM_FOLLOWED", userId: { in: followerIds } } })).toBe(before);
    } finally { await prisma.$executeRaw`ALTER TABLE "Notification" DROP CONSTRAINT "bulk_test_failure"`; }
  });

  test("notification failure rolls back owner/staff edits, deletions and staff audit entries", async () => {
    const target = await event("Bulk unchanged");
    const auditCount = await prisma.auditEntry.count({ where: { targetId: target.id } });
    await prisma.$executeRaw`ALTER TABLE "Notification" ADD CONSTRAINT "bulk_test_failure" CHECK ("userId" <> 'ffffffff-ffff-4fff-8fff-ffffffffffff') NOT VALID`;
    try {
      for (const [prefix, token] of [["", ownerToken], ["/admin", staffToken]]) {
        await request(app).put(`${prefix}/events/${target.id}`).set("Authorization", token).send({ name: "Bulk must roll back" }).expect(500);
        expect((await prisma.event.findUniqueOrThrow({ where: { id: target.id } })).name).toBe("Bulk unchanged");
        await request(app).delete(`${prefix}/events/${target.id}`).set("Authorization", token).expect(500);
        expect(await prisma.registration.count({ where: { eventId: target.id } })).toBe(2);
      }
      expect(await prisma.auditEntry.count({ where: { targetId: target.id } })).toBe(auditCount);
    } finally { await prisma.$executeRaw`ALTER TABLE "Notification" DROP CONSTRAINT "bulk_test_failure"`; }
  });

  test("reminder runs are bounded, resume on the next run and do not duplicate overlapping work", async () => {
    const target = await prisma.event.create({ data: { name: "Bulk reminders", categoryId, createdByUserId: owner,
      date: new Date(Date.now() + 300000), location: "Fictional venue", latitude: 1, longitude: 2 } });
    await prisma.registration.createMany({ data: followerIds.slice(0, 1001).map(userId => ({ userId, eventId: target.id, status: "CONFIRMED" })) });
    await Promise.all([sendDueEventReminders(), sendDueEventReminders()]);
    expect(await prisma.notification.count({ where: { eventId: target.id, type: "EVENT_REMINDER" } })).toBe(1000);
    expect(await prisma.registration.count({ where: { eventId: target.id, reminderSent: false } })).toBe(1);
    await sendDueEventReminders();
    expect(await prisma.notification.count({ where: { eventId: target.id, type: "EVENT_REMINDER" } })).toBe(1001);
    expect(await prisma.registration.count({ where: { eventId: target.id, reminderSent: false } })).toBe(0);
  });
});
