import request from "supertest";
import app from "../src/app";
import prisma from "../src/prisma";
import { generateToken } from "../src/utils/jwt";

const isolated = process.env.RELIABILITY_TEST_DB_NAME ? describe : describe.skip;
isolated("Private saved events on PostgreSQL", () => {
  let owner: string, viewer: string, other: string, categoryId: string;
  const tokens: Record<string, string> = {};
  const auth = (id: string) => `Bearer ${tokens[id]}`;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== `/${process.env.RELIABILITY_TEST_DB_NAME}` || !/^event_tracker_reliability_\d+_[a-f0-9]{8}$/.test(process.env.RELIABILITY_TEST_DB_NAME!)) throw Error('Disposable local database required');
    categoryId = (await prisma.category.findFirstOrThrow({ where: { name: 'Music', isCustom: false } })).id;
    const users = await Promise.all(['owner', 'viewer', 'other'].map(name => prisma.user.create({ data: { name: `Saved ${name}`, email: `saved-${name}@example.test` } })));
    [owner, viewer, other] = users.map(user => user.id);
    for (const user of users) tokens[user.id] = generateToken(user.id);
  });
  beforeEach(async () => { await prisma.savedEvent.deleteMany({ where: { userId: { in: [owner, viewer, other] } } }); });
  afterAll(async () => { await prisma.$disconnect(); });
  async function event(extra: Record<string, unknown> = {}) {
    return prisma.event.create({ data: { name: 'Saved fixture', categoryId, createdByUserId: owner, location: 'Fictional venue', latitude: 1, longitude: 2, date: new Date('2099-06-01T12:00:00Z'), ...extra } });
  }
  const list = (id: string, query = '') => request(app).get(`/events?scope=saved&page=1${query}`).set('Authorization', auth(id));
  it('requires authentication, validates IDs and refuses unavailable events', async () => {
    const publicEvent = await event();
    expect((await request(app).put(`/events/${publicEvent.id}/save`)).status).toBe(401);
    expect((await request(app).get('/events/saved-ids')).status).toBe(401);
    expect((await request(app).get('/events?scope=saved&page=1')).status).toBe(401);
    for (const method of ['put', 'delete'] as const) expect((await request(app)[method]('/events/invalid/save').set('Authorization', auth(viewer))).status).toBe(400);
    const privateEvent = await event({ visibility: 'INVITE_ONLY' });
    expect((await request(app).put(`/events/${privateEvent.id}/save`).set('Authorization', auth(viewer))).status).toBe(404);
    expect((await request(app).put('/events/00000000-0000-4000-8000-000000000000/save').set('Authorization', auth(viewer))).status).toBe(404);
  });
  it('handles concurrent saves/removals idempotently without attendance or notifications', async () => {
    const target = await event();
    const notifications = await prisma.notification.count();
    const saves = await Promise.all(Array.from({ length: 5 }, () => request(app).put(`/events/${target.id}/save`).set('Authorization', auth(viewer))));
    expect(saves.map(result => result.status)).toEqual([200, 200, 200, 200, 200]);
    expect(await prisma.savedEvent.count({ where: { eventId: target.id } })).toBe(1);
    expect(await prisma.registration.count({ where: { eventId: target.id } })).toBe(0);
    expect(await prisma.notification.count()).toBe(notifications);
    expect((await list(viewer)).body.items.map((e: any) => e.id)).toContain(target.id);
    expect((await list(other)).body.total).toBe(0);
    const detail = await request(app).get(`/events/${target.id}`);
    expect(detail.body).not.toHaveProperty('savedBy');
    expect(detail.body).not.toHaveProperty('savedEvents');
    await request(app).delete(`/events/${target.id}/save`).set('Authorization', auth(other)).expect(200);
    expect(await prisma.savedEvent.count({ where: { eventId: target.id } })).toBe(1);
    for (let i = 0; i < 2; i++) await request(app).delete(`/events/${target.id}/save`).set('Authorization', auth(viewer)).expect(200);
    expect((await list(viewer)).body.total).toBe(0);
  });
  it('rechecks follow/invite access and organizer bans on lists, IDs and dashboard', async () => {
    const followed = await event({ visibility: 'FOLLOWERS_ONLY' });
    const invited = await event({ visibility: 'INVITE_ONLY' });
    await prisma.follow.create({ data: { followerId: viewer, followingId: owner } });
    await prisma.eventInvite.create({ data: { eventId: invited.id, invitedUserId: viewer } });
    for (const target of [followed, invited]) await request(app).put(`/events/${target.id}/save`).set('Authorization', auth(viewer)).expect(200);
    expect((await list(viewer)).body.total).toBe(2);
    await prisma.follow.deleteMany({ where: { followerId: viewer, followingId: owner } });
    await prisma.eventInvite.deleteMany({ where: { eventId: invited.id } });
    expect((await list(viewer)).body.total).toBe(0);
    expect((await request(app).get('/events/saved-ids').set('Authorization', auth(viewer))).body).toEqual([]);
    expect((await request(app).get('/users/me/dashboard').set('Authorization', auth(viewer))).body.savedUpcomingEvents).toEqual([]);
    await request(app).delete(`/events/${invited.id}/save`).set('Authorization', auth(viewer)).expect(200);
    await prisma.follow.create({ data: { followerId: viewer, followingId: owner } });
    expect((await list(viewer)).body.total).toBe(1);
    await prisma.user.update({ where: { id: owner }, data: { bannedUntil: new Date(Date.now() + 3600000) } });
    expect((await list(viewer)).body.total).toBe(0);
    expect((await request(app).put(`/events/${followed.id}/save`).set('Authorization', auth(viewer))).status).toBe(404);
    await prisma.user.update({ where: { id: owner }, data: { bannedUntil: null } });
    await prisma.follow.deleteMany({ where: { followerId: viewer, followingId: owner } });
  });
  it('paginates stable saved results and provides a six-event dashboard preview', async () => {
    const targets = await Promise.all(Array.from({ length: 13 }, () => event()));
    await prisma.savedEvent.createMany({ data: targets.map(target => ({ userId: viewer, eventId: target.id })) });
    const first = await list(viewer);
    const last = await request(app).get('/events?scope=saved&page=2&pageSize=12').set('Authorization', auth(viewer));
    expect(first.body.items).toHaveLength(12); expect(first.body.totalPages).toBe(2);
    expect(last.body.items).toHaveLength(1);
    expect(new Set([...first.body.items, ...last.body.items].map((e: any) => e.id)).size).toBe(13);
    const dashboard = await request(app).get('/users/me/dashboard').set('Authorization', auth(viewer));
    expect(dashboard.body.savedUpcomingEvents).toHaveLength(6); expect(dashboard.body.hasMore.savedUpcomingEvents).toBe(true);
    await prisma.savedEvent.deleteMany({ where: { userId: viewer, eventId: { in: targets.slice(6).map(target => target.id) } } });
    const six = await request(app).get('/users/me/dashboard').set('Authorization', auth(viewer));
    expect(six.body.savedUpcomingEvents).toHaveLength(6); expect(six.body.hasMore.savedUpcomingEvents).toBe(false);
  });
  it('keeps ended/cancelled events in history and saves only the chosen recurrence', async () => {
    const ended = await event({ date: new Date('2020-01-01') });
    const cancelled = await event({ cancelledAt: new Date() });
    const ongoing = await event({ date: new Date(Date.now() - 60000), endDate: new Date(Date.now() + 3600000) });
    const root = await event({ isRecurring: true, recurrencePattern: 'WEEKLY' });
    const next = await event({ parentEventId: root.id });
    for (const target of [ended, cancelled, ongoing, root]) await request(app).put(`/events/${target.id}/save`).set('Authorization', auth(viewer)).expect(200);
    const active = (await list(viewer)).body.items.map((e: any) => e.id);
    expect(active).toEqual(expect.arrayContaining([ongoing.id, root.id])); expect(active).not.toContain(next.id);
    expect((await list(viewer, '&includePast=true')).body.items.map((e: any) => e.id).sort()).toEqual([ended.id, cancelled.id].sort());
  });
  it('cascades saved rows on permanent event and account deletion', async () => {
    const target = await event();
    await prisma.savedEvent.create({ data: { userId: viewer, eventId: target.id } });
    await request(app).delete(`/events/${target.id}`).set('Authorization', auth(owner)).expect(200);
    expect(await prisma.savedEvent.count({ where: { eventId: target.id } })).toBe(0);
    const temp = await prisma.user.create({ data: { name: 'Saved cascade', email: 'saved-cascade@example.test' } });
    const another = await event();
    await prisma.savedEvent.create({ data: { userId: temp.id, eventId: another.id } });
    await prisma.user.delete({ where: { id: temp.id } });
    expect(await prisma.savedEvent.count({ where: { userId: temp.id } })).toBe(0);
  });
});
