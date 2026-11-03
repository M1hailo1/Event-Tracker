import request from "supertest";
import app from "../src/app";
import prisma from "../src/prisma";
import { generateToken } from "../src/utils/jwt";
import { generateMissingRecurringInstances } from "../src/controllers/eventController";
import { sendDueEventReminders } from "../src/utils/eventReminders";

const isolated = process.env.RELIABILITY_TEST_DB_NAME ? describe : describe.skip;
isolated('Permanent event cancellation on PostgreSQL', () => {
  let owner: string, token: string, staff: string, categoryId: string;
  let attendees: { id: string; token: string }[];
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.pathname !== `/${process.env.RELIABILITY_TEST_DB_NAME}` || !/^event_tracker_reliability_\d+_[a-f0-9]{8}$/.test(process.env.RELIABILITY_TEST_DB_NAME!)) throw Error('Disposable local database required');
    categoryId = (await prisma.category.findFirstOrThrow({ where: { name: 'Music', isCustom: false } })).id;
    const creator = await prisma.user.create({ data: { name: 'Cancel owner', email: 'cancel-owner@example.test' } }); owner = creator.id; token = generateToken(owner);
    staff = generateToken((await prisma.user.create({ data: { name: 'Cancel staff', email: 'cancel-staff@example.test', role: 'ADMIN' } })).id);
    attendees = await Promise.all(Array.from({ length: 8 }, async (_, i) => { const user = await prisma.user.create({ data: { name: `Cancel attendee ${i}`, email: `cancel-attendee-${i}@example.test` } }); return { id: user.id, token: generateToken(user.id) }; }));
  });
  afterAll(async () => { await prisma.$disconnect(); });
  async function fixture(data: { date?: Date; endDate?: Date; isRecurring?: boolean; recurrencePattern?: 'DAILY'; parentEventId?: string } = {}) {
    return prisma.event.create({ data: { name: 'Cancellation fixture', createdByUserId: owner, categoryId, categories: { connect: { id: categoryId } }, date: new Date(Date.now() + 3600000), location: 'Test venue', latitude: 1, longitude: 2, ...data } });
  }
  const cancel = (id: string, scope = 'OCCURRENCE', bearer = token) => request(app).post(`/events/${id}/cancel`).set('Authorization', `Bearer ${bearer}`).send({ scope });
  it('keeps the page, discussion and attendees, notifies once and permanently closes participation', async () => {
    const event = await fixture();
    await prisma.registration.createMany({ data: [owner, attendees[0]!.id, attendees[1]!.id].map(userId => ({ userId, eventId: event.id, status: 'CONFIRMED' as const })) });
    const comment = await prisma.eventComment.create({ data: { eventId: event.id, userId: attendees[0]!.id, body: 'Keep the discussion' } });
    await prisma.notification.create({ data: { userId: attendees[0]!.id, eventId: event.id, type: 'EVENT_REMINDER', message: 'Old reminder' } });
    const results = await Promise.all([cancel(event.id), cancel(event.id), cancel(event.id)]);
    expect(results.map(result => result.status)).toEqual([200,200,200]);
    expect(await prisma.notification.count({ where: { eventId: event.id, type: 'EVENT_CANCELLED' } })).toBe(2);
    expect((await request(app).get(`/events/${event.id}`)).body.cancelledAt).toBeTruthy();
    expect(await prisma.eventComment.findUnique({ where: { id: comment.id } })).not.toBeNull();
    expect((await request(app).post(`/events/${event.id}/comments`).set('Authorization', `Bearer ${attendees[0]!.token}`).send({ body: 'Discussion remains open' })).status).toBe(201);
    expect(await prisma.registration.count({ where: { eventId: event.id } })).toBe(3);
    expect((await request(app).get('/events')).body.some((item: {id:string}) => item.id === event.id)).toBe(false);
    expect((await request(app).get('/events?includePast=true')).body.some((item: {id:string}) => item.id === event.id)).toBe(true);
    expect((await request(app).post(`/events/${event.id}/register`).set('Authorization', `Bearer ${attendees[2]!.token}`)).status).toBe(409);
    for (const [url,bearer] of [[`/events/${event.id}`,token],[`/admin/events/${event.id}`,staff]]) expect((await request(app).put(url!).set('Authorization', `Bearer ${bearer}`).send({ name: 'Cannot restore', cancelledAt: null })).status).toBe(409);
    expect((await request(app).put(`/events/${event.id}/rating`).set('Authorization', `Bearer ${attendees[0]!.token}`).send({ score: 5 })).status).toBe(409);
    expect((await request(app).post(`/events/${event.id}/invites`).set('Authorization', `Bearer ${token}`).send({ userId: attendees[2]!.id })).status).toBe(409);
    await sendDueEventReminders(); expect(await prisma.notification.count({ where: { eventId: event.id, type: 'EVENT_REMINDER' } })).toBe(0);
    await prisma.event.update({ where: { id: event.id }, data: { date: new Date(Date.now()-3600000) } });
    expect((await request(app).get('/users/me/stats').set('Authorization', `Bearer ${attendees[0]!.token}`)).body.totalEvents).toBe(0);
  });
  it('checks current roles and denies strangers or cancellation of ended events', async () => {
    const event = await fixture();
    expect((await cancel(event.id,'OCCURRENCE',staff)).status).toBe(403);
    expect((await request(app).delete(`/events/${event.id}`).set('Authorization', `Bearer ${staff}`)).status).toBe(403);
    expect((await cancel(event.id,'OCCURRENCE',attendees[0]!.token)).status).toBe(403);
    await prisma.user.update({ where: { id: attendees[0]!.id }, data: { role: 'MODERATOR' } });
    expect((await cancel(event.id,'OCCURRENCE',attendees[0]!.token)).status).toBe(403);
    expect((await request(app).post(`/admin/events/${event.id}/cancel`).set('Authorization', `Bearer ${attendees[0]!.token}`)).status).toBe(200);
    await prisma.user.update({ where: { id: attendees[0]!.id }, data: { role: 'USER' } });
    expect((await cancel((await fixture()).id,'OCCURRENCE',attendees[0]!.token)).status).toBe(403);
    expect((await request(app).post(`/admin/events/${(await fixture({ date: new Date(Date.now()-3600000) })).id}/cancel`).set('Authorization', `Bearer ${staff}`)).status).toBe(409);
  });
  it('continues a recurring series after cancelling only one occurrence', async () => {
    const event = await fixture({ isRecurring: true, recurrencePattern: 'DAILY' }); expect((await cancel(event.id)).status).toBe(200);
    await prisma.event.update({ where: { id: event.id }, data: { date: new Date(Date.now()-86400000) } });
    await generateMissingRecurringInstances(); const next = await prisma.event.findFirstOrThrow({ where: { parentEventId: event.id } });
    expect(next.cancelledAt).toBeNull(); expect(next.recurrenceStopped).toBe(false);
  });
  it('stops the whole series while preserving ended history', async () => {
    const root = await fixture({ date: new Date(Date.now()-86400000), isRecurring: true, recurrencePattern: 'DAILY' });
    const child = await fixture({ parentEventId: root.id, isRecurring: true, recurrencePattern: 'DAILY' });
    const grandchild = await fixture({ parentEventId: child.id, isRecurring: true, recurrencePattern: 'DAILY' });
    expect((await cancel(child.id,'SERIES')).status).toBe(200);
    expect((await prisma.event.findUniqueOrThrow({ where: { id: root.id } })).cancelledAt).toBeNull();
    for (const id of [root.id,child.id,grandchild.id]) expect((await prisma.event.findUniqueOrThrow({ where: { id } })).recurrenceStopped).toBe(true);
    for (const id of [child.id,grandchild.id]) expect((await prisma.event.findUniqueOrThrow({ where: { id } })).cancelledAt).not.toBeNull();
    await generateMissingRecurringInstances(); expect(await prisma.event.count({ where: { parentEventId: grandchild.id } })).toBe(0);
  });
  it('serializes cancellation against joining and reminder delivery', async () => {
    const event = await fixture(); await prisma.registration.create({ data: { userId: owner, eventId: event.id, status: 'CONFIRMED' } });
    await Promise.all([cancel(event.id), sendDueEventReminders(), ...attendees.map(user => request(app).post(`/events/${event.id}/register`).set('Authorization', `Bearer ${user.token}`))]);
    expect((await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).cancelledAt).not.toBeNull();
    expect(await prisma.notification.count({ where: { eventId: event.id, type: 'EVENT_REMINDER' } })).toBe(0);
    expect(await prisma.notification.count({ where: { eventId: event.id, type: 'EVENT_CANCELLED' } })).toBe(await prisma.registration.count({ where: { eventId: event.id } }) - 1);
  });
  it('keeps permanent deletion available for accidental events', async () => {
    const event = await fixture(); expect((await request(app).delete(`/events/${event.id}`).set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).get(`/events/${event.id}`)).status).toBe(404);
  });
  it('allows cancellation while an event is ongoing', async () => {
    const event = await fixture({ date: new Date(Date.now()-3600000), endDate: new Date(Date.now()+3600000) });
    expect((await cancel(event.id)).status).toBe(200);
  });
  it('serializes stopping a series against generation of the next occurrence', async () => {
    const event = await fixture({ isRecurring: true, recurrencePattern: 'DAILY' });
    expect((await cancel(event.id)).status).toBe(200);
    await prisma.event.update({ where: { id: event.id }, data: { date: new Date(Date.now()-86400000) } });
    const [result] = await Promise.all([cancel(event.id,'SERIES'),generateMissingRecurringInstances()]);
    expect(result.status).toBe(200);
    const rows = await prisma.event.findMany({ where: { OR: [{ id: event.id }, { parentEventId: event.id }] } });
    expect(rows.every(row => row.recurrenceStopped)).toBe(true);
    expect(rows.every(row => row.cancelledAt !== null)).toBe(true);
  });
});
