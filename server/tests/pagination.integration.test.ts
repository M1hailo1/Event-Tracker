import request from "supertest";
import app from "../src/app";
import prisma from "../src/prisma";
import { generateToken } from "../src/utils/jwt";
const isolated = process.env.RELIABILITY_TEST_DB_NAME ? describe : describe.skip;
isolated("Pagination and organizer profile visibility on PostgreSQL", () => {
  let owner: string, viewer: string, outsider: string, ownerToken: string, viewerToken: string, adminToken: string, categoryId: string;
  const auth = (token: string) => `Bearer ${token}`;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== `/${process.env.RELIABILITY_TEST_DB_NAME}` || !/^event_tracker_reliability_\d+_[a-f0-9]{8}$/.test(process.env.RELIABILITY_TEST_DB_NAME!)) throw Error('Disposable local database required');
    categoryId = (await prisma.category.findFirstOrThrow({ where: { name: 'Music', isCustom: false } })).id;
    const users = await Promise.all(['owner', 'viewer', 'outsider', 'admin'].map(name => prisma.user.create({ data: { name: `Pagination ${name}`, email: `pagination-${name}@example.test`, role: name === 'admin' ? 'ADMIN' : 'USER' } })));
    [owner, viewer, outsider] = users.map(user => user.id);
    ownerToken = generateToken(owner); viewerToken = generateToken(viewer); adminToken = generateToken(users[3].id);
    await prisma.event.createMany({ data: Array.from({ length: 27 }, (_, i) => ({ name: `Pagination event ${String(i).padStart(2, '0')}`, categoryId, createdByUserId: owner, location: 'Fictional venue', latitude: 1, longitude: 2, date: new Date('2099-06-01T12:00:00Z') })) });
  });
  afterAll(async () => { await prisma.$disconnect(); });
  async function createEvent(visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'INVITE_ONLY', extra: Record<string, unknown> = {}) {
    return prisma.event.create({ data: { name: 'Privacy fixture', categoryId, createdByUserId: owner, location: 'Fictional venue', latitude: 1, longitude: 2, date: new Date('2099-07-01T12:00:00Z'), visibility, ...extra } });
  }
  it('paginates a filtered organizer list with stable ties and validates pagination', async () => {
    const base = `/events?organizerId=${owner}&pageSize=12&search=Pagination`;
    const pages = await Promise.all([1, 2, 3].map(page => request(app).get(`${base}&page=${page}`)));
    expect(pages.map(page => page.body.items.length)).toEqual([12, 12, 3]);
    expect(pages[0].body.total).toBe(27); expect(pages[0].body.totalPages).toBe(3);
    expect(new Set(pages.flatMap(page => page.body.items.map((event: any) => event.id))).size).toBe(27);
    for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=no', 'page=1&pageSize=101', 'page=999999999999999']) expect((await request(app).get(`/events?${query}`)).status).toBe(400);
  });
  it('filters organizer events by visibility, follow changes, invitations and lifecycle', async () => {
    const restricted = await createEvent('FOLLOWERS_ONLY'); const invited = await createEvent('INVITE_ONLY');
    const attended = await prisma.event.create({ data: { name: 'Someone else organizes', categoryId, createdByUserId: outsider, location: 'Venue', latitude: 1, longitude: 2, date: new Date('2099-07-01T12:00:00Z'), registrations: { create: { userId: owner, status: 'CONFIRMED' } } } });
    const cancelled = await createEvent('PUBLIC', { cancelledAt: new Date() });
    const url = `/events?organizerId=${owner}&page=1&pageSize=100`;
    const anonymous = await request(app).get(url);
    expect(anonymous.body.items.some((e: any) => [restricted.id, invited.id, attended.id, cancelled.id].includes(e.id))).toBe(false);
    await prisma.follow.create({ data: { followerId: viewer, followingId: owner } });
    const followed = await request(app).get(url).set('Authorization', auth(viewerToken));
    expect(followed.body.items.some((e: any) => e.id === restricted.id)).toBe(true);
    expect(followed.body.items.some((e: any) => e.id === invited.id)).toBe(false);
    await prisma.eventInvite.create({ data: { eventId: invited.id, invitedUserId: viewer } });
    expect((await request(app).get(url).set('Authorization', auth(viewerToken))).body.items.some((e: any) => e.id === invited.id)).toBe(true);
    await prisma.follow.deleteMany({ where: { followerId: viewer, followingId: owner } });
    expect((await request(app).get(url).set('Authorization', auth(viewerToken))).body.items.some((e: any) => e.id === restricted.id)).toBe(false);
    expect((await request(app).get(`${url}&includePast=true`)).body.items.some((e: any) => e.id === cancelled.id)).toBe(true);
    expect((await request(app).get(`${url}&from=2099-08-01&to=2099-09-01`)).body.total).toBe(0);
  });
  it('searches admin records before pagination and keeps exact event selection', async () => {
    const event = await prisma.event.findFirstOrThrow({ where: { createdByUserId: owner, name: 'Pagination event 26' } });
    const result = await request(app).get('/admin/events?page=1&search=Pagination event 26').set('Authorization', auth(adminToken));
    expect(result.body.total).toBe(1); expect(result.body.items[0].id).toBe(event.id);
    const exact = await request(app).get(`/admin/events?page=1&event=${event.id}`).set('Authorization', auth(adminToken));
    expect(exact.body.items.map((e: any) => e.id)).toEqual([event.id]);
    const users = await request(app).get('/admin/users?page=1&search=pagination-viewer@example.test&role=USER&status=active').set('Authorization', auth(adminToken));
    expect(users.body.total).toBe(1); expect(users.body.items[0].id).toBe(viewer);
    expect((await request(app).get('/admin/events?page=1').set('Authorization', auth(viewerToken))).status).toBe(403);
  });
  it('keeps full follower counts and follow state beyond the first page', async () => {
    const people = await Promise.all(Array.from({ length: 23 }, (_, i) => prisma.user.create({ data: { name: `Follower ${i}`, email: `pagination-follower-${i}@example.test` } })));
    await prisma.follow.create({ data: { followerId: viewer, followingId: owner, createdAt: new Date('2020-01-01') } });
    await prisma.follow.createMany({ data: people.map(user => ({ followerId: user.id, followingId: owner })) });
    const first = await request(app).get(`/users/${owner}/followers?page=1`).set('Authorization', auth(viewerToken));
    expect(first.body.total).toBe(24); expect(first.body.items.length).toBe(20); expect(first.body.isFollowing).toBe(true);
    expect(first.body.items.some((u: any) => u.id === viewer)).toBe(false);
    const second = await request(app).get(`/users/${owner}/followers?page=2`);
    expect(second.body.items.length).toBe(4);
  });
  it('paginates attendees without losing the current registration and protects private lists', async () => {
    const event = await createEvent('PUBLIC');
    const people = await prisma.user.findMany({ where: { email: { startsWith: 'pagination-follower-' } } });
    await prisma.registration.createMany({ data: [...people.map(user => user.id), viewer].map(userId => ({ userId, eventId: event.id, status: 'CONFIRMED' as const })) });
    const detail = await request(app).get(`/events/${event.id}`).set('Authorization', auth(viewerToken));
    expect(detail.body.registrations.map((r: any) => r.userId)).toContain(viewer);
    const first = await request(app).get(`/events/${event.id}/attendees?page=1`);
    expect(first.body.total).toBe(24); expect(first.body.items.length).toBe(20);
    expect((await request(app).get(`/events/${event.id}/attendees?page=2`)).body.items.length).toBe(4);
    const privateEvent = await createEvent('INVITE_ONLY');
    expect((await request(app).get(`/events/${privateEvent.id}/attendees?page=1`)).status).toBe(403);
  });
  it('paginates notifications and invitations, excluding already invited candidates', async () => {
    await prisma.notification.createMany({ data: Array.from({ length: 25 }, (_, i) => ({ userId: viewer, type: 'NEW_FOLLOWER' as const, message: `Pagination notification ${i}` })) });
    const first = await request(app).get('/notifications?page=1').set('Authorization', auth(viewerToken));
    expect(first.body.items.length).toBe(20); expect(first.body.total).toBeGreaterThanOrEqual(25);
    expect((await request(app).get('/notifications?page=2').set('Authorization', auth(viewerToken))).body.items.length).toBeGreaterThanOrEqual(5);
    const event = await createEvent('INVITE_ONLY');
    await prisma.eventInvite.create({ data: { eventId: event.id, invitedUserId: viewer } });
    const available = await request(app).get(`/events/${event.id}/invites?page=1&kind=available`).set('Authorization', auth(ownerToken));
    expect(available.status).toBe(200); expect(available.body.total).toBe(23); expect(available.body.items.some((u: any) => u.id === viewer)).toBe(false);
    expect((await request(app).get(`/events/${event.id}/invites?page=1`).set('Authorization', auth(viewerToken))).status).toBe(403);
    const invited = await request(app).get(`/events/${event.id}/invites?page=1`).set('Authorization', auth(ownerToken));
    expect(invited.body.items.map((u: any) => u.id)).toEqual([viewer]);
  });
  it('only advertises more dashboard results beyond the six-event preview', async () => {
    const events = await prisma.event.findMany({ where: { createdByUserId: owner, name: { startsWith: 'Pagination event' } }, take: 7 });
    await prisma.registration.deleteMany({ where: { userId: outsider } });
    await prisma.registration.create({ data: { userId: outsider, eventId: events[0].id, status: 'CONFIRMED' } });
    const token = generateToken(outsider);
    const first = await request(app).get('/users/me/dashboard').set('Authorization', auth(token));
    expect(first.status).toBe(200);
    expect(first.body.registeredUpcomingEvents).toHaveLength(1);
    expect(first.body.hasMore.registeredUpcomingEvents).toBe(false);
    await prisma.registration.createMany({ data: events.slice(1, 6).map(event => ({ userId: outsider, eventId: event.id, status: 'CONFIRMED' as const })) });
    const six = await request(app).get('/users/me/dashboard').set('Authorization', auth(token));
    expect(six.body.registeredUpcomingEvents).toHaveLength(6);
    expect(six.body.hasMore.registeredUpcomingEvents).toBe(false);
    await prisma.registration.create({ data: { userId: outsider, eventId: events[6].id, status: 'CONFIRMED' } });
    const seven = await request(app).get('/users/me/dashboard').set('Authorization', auth(token));
    expect(seven.body.registeredUpcomingEvents).toHaveLength(6);
    expect(seven.body.hasMore.registeredUpcomingEvents).toBe(true);
  });

  it('exposes only allowlisted public sharing details regardless of viewer privileges', async () => {
    const publicEvent = await createEvent('PUBLIC', { coverId: 'music-live', description: 'Public preview description' });
    const publicPreview = await request(app).get(`/events/${publicEvent.id}/share`);
    expect(publicPreview.status).toBe(200);
    expect(publicPreview.headers['cache-control']).toBe('no-store');
    expect(publicPreview.body).toMatchObject({ visibility: 'PUBLIC', coverId: 'music-live', organizer: 'Pagination owner' });
    expect(publicPreview.body).not.toHaveProperty('registrations');
    expect(publicPreview.body).not.toHaveProperty('location');
    for (const visibility of ['FOLLOWERS_ONLY', 'INVITE_ONLY'] as const) {
      const privateEvent = await createEvent(visibility, { name: 'Secret event', description: 'Secret details' });
      for (const token of [ownerToken, adminToken, viewerToken]) {
        const hidden = await request(app).get(`/events/${privateEvent.id}/share`).set('Authorization', auth(token));
        expect(hidden.status).toBe(404);
        expect(JSON.stringify(hidden.body)).not.toMatch(/Secret/);
      }
    }
    await prisma.user.update({ where: { id: owner }, data: { bannedUntil: new Date(Date.now() + 3600000) } });
    expect((await request(app).get(`/events/${publicEvent.id}/share`)).status).toBe(404);
    await prisma.user.update({ where: { id: owner }, data: { bannedUntil: null } });
    await prisma.event.update({ where: { id: publicEvent.id }, data: { visibility: 'INVITE_ONLY' } });
    expect((await request(app).get(`/events/${publicEvent.id}/share`)).status).toBe(404);
    expect((await request(app).get('/events/not-a-uuid/share')).status).toBe(404);
  });

});
