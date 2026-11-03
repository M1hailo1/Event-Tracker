import request from "supertest";
import app from "../src/app";
import prisma from "../src/prisma";
import { generateToken } from "../src/utils/jwt";
import { sendDueEventRatingPrompts } from "../src/utils/eventRatingPrompts";

const isolated = process.env.RELIABILITY_TEST_DB_NAME ? describe : describe.skip;
isolated("Join notifications and optional rating prompts on PostgreSQL", () => {
  let owner: string, ownerToken: string, categoryId: string;
  let attendees: { id: string; token: string }[];
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== `/${process.env.RELIABILITY_TEST_DB_NAME}` || !/^event_tracker_reliability_\d+_[a-f0-9]{8}$/.test(process.env.RELIABILITY_TEST_DB_NAME!)) throw Error('Disposable local database required');
    categoryId = (await prisma.category.findFirstOrThrow({ where: { name: 'Music', isCustom: false } })).id;
    owner = (await prisma.user.create({ data: { name: 'Notification Organizer', email: 'participation-owner@example.test' } })).id;
    ownerToken = generateToken(owner);
    attendees = await Promise.all(Array.from({ length: 6 }, async (_, i) => {
      const user = await prisma.user.create({ data: { name: `Notification Attendee ${i}`, email: `participation-attendee-${i}@example.test` } });
      return { id: user.id, token: generateToken(user.id) };
    }));
  });
  afterAll(async () => { await prisma.$disconnect(); });
  async function event(extra: Record<string, unknown> = {}) {
    return prisma.event.create({ data: {
      name: 'Notification fixture', createdByUserId: owner, categoryId,
      date: new Date(Date.now() + 3600000), location: 'Fictional venue', latitude: 1, longitude: 2,
      ratingPromptAfter: new Date(Date.now() - 86400000), ...extra,
    } });
  }
  const bearer = (token: string) => `Bearer ${token}`;
  const join = (id: string, index: number) => request(app).post(`/events/${id}/register`).set('Authorization', bearer(attendees[index].token));
  async function register(eventId: string, userIds: string[]) {
    await prisma.registration.createMany({ data: userIds.map(userId => ({ userId, eventId, status: 'CONFIRMED' as const })) });
  }
  it('groups five simultaneous successful joins, but not duplicate or full requests', async () => {
    const fixture = await event({ maxCapacity: 5 });
    const joined = await Promise.all([0, 1, 2, 3, 4].map(i => join(fixture.id, i)));
    expect(joined.map(result => result.status)).toEqual([201, 201, 201, 201, 201]);
    expect((await join(fixture.id, 0)).status).toBe(409);
    expect((await join(fixture.id, 5)).status).toBe(409);
    const notices = await prisma.notification.findMany({ where: { eventId: fixture.id, type: 'EVENT_JOINED' } });
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ userId: owner, activityCount: 5, isRead: false, commentId: null, message: '5 people joined your event "Notification fixture"' });
    expect(await prisma.notification.count({ where: { eventId: fixture.id, userId: { not: owner } } })).toBe(0);
  });
  it('starts a new group after reading and never notifies about the organizer joining', async () => {
    const fixture = await event();
    expect((await request(app).post(`/events/${fixture.id}/register`).set('Authorization', bearer(ownerToken))).status).toBe(201);
    expect(await prisma.notification.count({ where: { eventId: fixture.id } })).toBe(0);
    await join(fixture.id, 0);
    const first = await prisma.notification.findFirstOrThrow({ where: { eventId: fixture.id } });
    expect(first.message).toBe('1 person joined your event "Notification fixture"');
    expect((await request(app).patch(`/notifications/${first.id}/read`).set('Authorization', bearer(ownerToken))).status).toBe(200);
    await join(fixture.id, 1);
    const notices = await prisma.notification.findMany({ where: { eventId: fixture.id, type: 'EVENT_JOINED' } });
    expect(notices).toHaveLength(2);
    expect(notices.filter(n => !n.isRead)).toHaveLength(1);
    expect(notices.find(n => !n.isRead)?.activityCount).toBe(1);
  });
  it('prompts unrated confirmed attendees only, once across concurrent workers and cleanup', async () => {
    const fixture = await event({ date: new Date(Date.now() - 7200000), endDate: new Date(Date.now() - 3600000) });
    await register(fixture.id, [owner, attendees[0].id, attendees[1].id]);
    await prisma.registration.create({ data: { userId: attendees[2].id, eventId: fixture.id, status: 'PENDING' } });
    await prisma.eventRating.create({ data: { userId: attendees[1].id, eventId: fixture.id, score: 4 } });
    await Promise.all([sendDueEventRatingPrompts(), sendDueEventRatingPrompts(), sendDueEventRatingPrompts()]);
    const notices = await prisma.notification.findMany({ where: { eventId: fixture.id, type: 'EVENT_RATING_PROMPT' } });
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ userId: attendees[0].id, eventId: fixture.id, commentId: null });
    expect(notices[0].message).toMatch(/if you'd like/);
    await prisma.notification.deleteMany({ where: { eventId: fixture.id, type: 'EVENT_RATING_PROMPT' } });
    await sendDueEventRatingPrompts();
    expect(await prisma.notification.count({ where: { eventId: fixture.id, type: 'EVENT_RATING_PROMPT' } })).toBe(0);
  });
  it('skips ongoing, cancelled and historical events; falls back to start when no end exists', async () => {
    const ongoing = await event({ date: new Date(Date.now() - 3600000), endDate: new Date(Date.now() + 3600000) });
    const cancelled = await event({ date: new Date(Date.now() - 3600000), cancelledAt: new Date() });
    const historical = await event({ date: new Date(Date.now() - 3600000), ratingPromptAfter: new Date() });
    const noEnd = await event({ date: new Date(Date.now() - 1000) });
    for (const fixture of [ongoing, cancelled, historical, noEnd]) await register(fixture.id, [attendees[0].id]);
    await sendDueEventRatingPrompts();
    expect(await prisma.notification.count({ where: { eventId: { in: [ongoing.id, cancelled.id, historical.id] }, type: 'EVENT_RATING_PROMPT' } })).toBe(0);
    expect(await prisma.notification.count({ where: { eventId: noEnd.id, type: 'EVENT_RATING_PROMPT' } })).toBe(1);
    // Restarting the check preserves the historical rollout boundary.
    await sendDueEventRatingPrompts();
    expect(await prisma.notification.count({ where: { eventId: historical.id, type: 'EVENT_RATING_PROMPT' } })).toBe(0);
  });
  it('skips attendees who are banned or have lost access to a private event', async () => {
    const fixture = await event({ date: new Date(Date.now() - 1000), visibility: 'FOLLOWERS_ONLY' });
    await register(fixture.id, [attendees[3].id, attendees[4].id]);
    await prisma.follow.create({ data: { followerId: attendees[4].id, followingId: owner } });
    await prisma.user.update({ where: { id: attendees[4].id }, data: { bannedUntil: new Date(Date.now() + 3600000) } });
    await sendDueEventRatingPrompts();
    expect(await prisma.notification.count({ where: { eventId: fixture.id, type: 'EVENT_RATING_PROMPT' } })).toBe(0);
  });
  it('removes an outstanding prompt after rating and leaves none when rating races the worker', async () => {
    const fixture = await event({ date: new Date(Date.now() - 1000) });
    await register(fixture.id, [attendees[0].id, attendees[1].id]);
    await sendDueEventRatingPrompts();
    expect(await prisma.notification.count({ where: { eventId: fixture.id, userId: attendees[0].id, type: 'EVENT_RATING_PROMPT' } })).toBe(1);
    const rating = await request(app).put(`/events/${fixture.id}/rating`).set('Authorization', bearer(attendees[0].token)).send({ score: 5 });
    expect(rating.status).toBe(200);
    expect(await prisma.notification.count({ where: { eventId: fixture.id, userId: attendees[0].id, type: 'EVENT_RATING_PROMPT' } })).toBe(0);
    await prisma.registration.update({ where: { userId_eventId: { userId: attendees[1].id, eventId: fixture.id } }, data: { ratingPromptSent: false } });
    await Promise.all([
      sendDueEventRatingPrompts(),
      request(app).put(`/events/${fixture.id}/rating`).set('Authorization', bearer(attendees[1].token)).send({ score: 4 }).then(result => expect(result.status).toBe(200)),
    ]);
    expect(await prisma.notification.count({ where: { eventId: fixture.id, userId: attendees[1].id, type: 'EVENT_RATING_PROMPT' } })).toBe(0);
  });
});
