import request from "supertest";
import app from "../src/app";
import prisma from "../src/prisma";
import { generateToken } from "../src/utils/jwt";
import { generateMissingRecurringInstances } from "../src/controllers/eventController";

// Use npm run test:reliability: its runner migrates and removes a disposable local DB.
const isolated = process.env.RELIABILITY_TEST_DB_NAME ? describe : describe.skip;
isolated("Event reliability on real PostgreSQL", () => {
  let ownerId: string, ownerToken: string, staffToken: string, categoryId: string;
  let attendees: { id: string; token: string }[];
  const future = () => new Date(Date.now() + 86400000);
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== `/${process.env.RELIABILITY_TEST_DB_NAME}` || !/^event_tracker_reliability_\d+_[a-f0-9]{8}$/.test(process.env.RELIABILITY_TEST_DB_NAME!)) throw Error('Disposable local database required');
    categoryId = (await prisma.category.findFirstOrThrow({ where: { name: 'Music', isCustom: false } })).id;
    const owner = await prisma.user.create({ data: { name: 'Owner', email: 'owner@example.test' } });
    ownerId = owner.id; ownerToken = generateToken(owner.id);
    const staff = await prisma.user.create({ data: { name: 'Staff', email: 'staff@example.test', role: 'ADMIN' } });
    staffToken = generateToken(staff.id);
    attendees = await Promise.all(Array.from({ length: 12 }, async (_, index) => {
      const user = await prisma.user.create({ data: { name: `Attendee ${index}`, email: `attendee-${index}@example.test` } });
      return { id: user.id, token: generateToken(user.id) };
    }));
  });
  afterAll(async () => { await prisma.$disconnect(); });
  async function event(data: { date?: Date; endDate?: Date | null; maxCapacity?: number; isRecurring?: boolean; recurrencePattern?: 'DAILY'; coverId?: string } = {}) {
    return prisma.event.create({ data: { name: 'Reliability fixture', categoryId, categories: { connect: { id: categoryId } }, createdByUserId: ownerId, location: 'Test venue', latitude: 1, longitude: 2, date: future(), ...data } });
  }
  it("creates the organizer registration with the event and counts it toward capacity", async () => {
    const created = await request(app).post('/events').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'One-seat fixture', categoryIds: [categoryId], date: future().toISOString(), location: 'Test venue', latitude: 1, longitude: 2, maxCapacity: 1 });
    expect(created.status).toBe(201);
    expect(await prisma.registration.count({ where: { eventId: created.body.id, userId: ownerId, status: 'CONFIRMED' } })).toBe(1);
    expect((await request(app).post(`/events/${created.body.id}/register`).set('Authorization', `Bearer ${attendees[0]!.token}`)).status).toBe(409);
  });
  it("admits exactly one of twelve concurrent requests for the final seat", async () => {
    for (let round = 0; round < 3; round++) {
      const fixture = await event({ maxCapacity: 2 });
      await prisma.registration.create({ data: { userId: ownerId, eventId: fixture.id, status: 'CONFIRMED' } });
      const results = await Promise.all(attendees.map(user => request(app).post(`/events/${fixture.id}/register`).set('Authorization', `Bearer ${user.token}`)));
      expect(results.filter(result => result.status === 201)).toHaveLength(1);
      expect(results.filter(result => result.status === 409)).toHaveLength(11);
      expect(await prisma.registration.count({ where: { eventId: fixture.id, status: 'CONFIRMED' } })).toBe(2);
    }
  });
  it("handles simultaneous duplicate requests without a server error", async () => {
    const fixture = await event({ maxCapacity: 10 });
    const results = await Promise.all(Array.from({ length: 4 }, () => request(app).post(`/events/${fixture.id}/register`).set('Authorization', `Bearer ${attendees[0]!.token}`)));
    expect(results.map(result => result.status).sort()).toEqual([201, 409, 409, 409]);
  });
  it("keeps ongoing events active but closes registration and does not allow early ratings", async () => {
    const fixture = await event({ date: new Date(Date.now() - 3600000), endDate: new Date(Date.now() + 3600000) });
    await prisma.registration.create({ data: { userId: attendees[0]!.id, eventId: fixture.id, status: 'CONFIRMED' } });
    const active = await request(app).get('/events');
    const history = await request(app).get('/events?includePast=true');
    expect(active.body.some((item: { id: string }) => item.id === fixture.id)).toBe(true);
    expect(history.body.some((item: { id: string }) => item.id === fixture.id)).toBe(false);
    const dashboard = await request(app).get('/users/me/dashboard').set('Authorization', `Bearer ${attendees[0]!.token}`);
    expect(dashboard.body.registeredUpcomingEvents.some((item: { id: string }) => item.id === fixture.id)).toBe(true);
    const join = await request(app).post(`/events/${fixture.id}/register`).set('Authorization', `Bearer ${attendees[1]!.token}`);
    expect(join.status).toBe(403); expect(join.body.error).toMatch(/registration closed/i);
    expect((await request(app).put(`/events/${fixture.id}/rating`).set('Authorization', `Bearer ${attendees[0]!.token}`).send({ score: 5 })).status).toBe(403);
    await prisma.event.update({ where: { id: fixture.id }, data: { endDate: new Date(Date.now() - 1000) } });
    expect((await request(app).get('/events?includePast=true')).body.some((item: { id: string }) => item.id === fixture.id)).toBe(true);
    expect((await request(app).put(`/events/${fixture.id}/rating`).set('Authorization', `Bearer ${attendees[0]!.token}`).send({ score: 5 })).status).toBe(200);
  });
  it.each(['owner', 'staff'])("validates merged dates and explicit end removal for %s edits", async actor => {
    const fixture = await event({ date: new Date('2099-01-01T12:00:00Z'), endDate: new Date('2099-01-01T14:00:00Z') });
    const url = actor === 'owner' ? `/events/${fixture.id}` : `/admin/events/${fixture.id}`;
    const token = actor === 'owner' ? ownerToken : staffToken;
    for (const body of [{ date: '2099-01-01T15:00:00.000Z' }, { endDate: '2099-01-01T11:00:00.000Z' }, { date: '2099-01-02T12:00:00.000Z', endDate: '2099-01-02T12:00:00.000Z' }]) expect((await request(app).put(url).set('Authorization', `Bearer ${token}`).send(body)).status).toBe(400);
    const stored = await prisma.event.findUniqueOrThrow({ where: { id: fixture.id } });
    expect(stored.date).toEqual(fixture.date); expect(stored.endDate).toEqual(fixture.endDate);
    expect((await request(app).put(url).set('Authorization', `Bearer ${token}`).send({ endDate: null, date: '2099-01-01T15:00:00.000Z' })).status).toBe(200);
    expect((await prisma.event.findUniqueOrThrow({ where: { id: fixture.id } })).endDate).toBeNull();
    expect((await request(app).put(url).set('Authorization', `Bearer ${token}`).send({ endDate: '2099-01-01T17:00:00.000Z' })).status).toBe(200);
  });
  it("preserves recurring duration, cover and categories without advancing ongoing events", async () => {
    const now = Date.now();
    const expired = await event({ date: new Date(now - 3 * 86400000), endDate: new Date(now - 3 * 86400000 + 7200000), isRecurring: true, recurrencePattern: 'DAILY', coverId: 'music-live' });
    const ongoing = await event({ date: new Date(now - 3600000), endDate: new Date(now + 3600000), isRecurring: true, recurrencePattern: 'DAILY' });
    await generateMissingRecurringInstances();
    const next = await prisma.event.findFirstOrThrow({ where: { parentEventId: expired.id }, include: { categories: true } });
    expect(next.endDate!.getTime() - next.date.getTime()).toBe(7200000);
    expect(next.date.getTime()).toBeGreaterThan(Date.now());
    expect(next.coverId).toBe('music-live'); expect(next.categories.map(category => category.id)).toEqual([categoryId]);
    expect(await prisma.event.count({ where: { parentEventId: ongoing.id } })).toBe(0);
  });
});
