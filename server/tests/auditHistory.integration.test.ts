import request from "supertest";
import app from "../src/app";
import prisma from "../src/prisma";
import { generateToken } from "../src/utils/jwt";

describe("Staff audit history", () => {
  let admin: string, moderator: string, member: string, categoryId: string;
  let adminToken: string, moderatorToken: string, memberToken: string;
  let sequence = 0;
  const account = (role: "USER" | "ADMIN" | "MODERATOR" = "USER") => prisma.user.create({
    data: { name: `Audit ${role} ${++sequence}`, email: `audit-${sequence}@example.test`, role },
  });
  const event = (owner: string, extra = {}) => prisma.event.create({ data: {
    name: "Audit event", date: new Date("2098-01-01T12:00:00Z"), categoryId, createdByUserId: owner,
    location: "Fictional venue", latitude: 1, longitude: 2, ...extra,
  } });
  const history = (query = {}) => request(app).get("/admin/audit-history").set("Authorization", adminToken).query(query);

  beforeAll(async () => {
    [admin, moderator, member] = (await Promise.all([account("ADMIN"), account("MODERATOR"), account()])).map(user => user.id);
    [adminToken, moderatorToken, memberToken] = [admin, moderator, member].map(id => `Bearer ${generateToken(id)}`);
    categoryId = (await prisma.category.findFirstOrThrow({ where: { name: "Music", isCustom: false } })).id;
  });
  afterAll(async () => { await prisma.$disconnect(); });

  test("only current admins can read history, including after a role change", async () => {
    await request(app).get("/admin/audit-history").expect(401);
    for (const token of [memberToken, moderatorToken]) await request(app).get("/admin/audit-history").set("Authorization", token).expect(403);
    const response = await history();
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    await prisma.user.update({ where: { id: admin }, data: { role: "MODERATOR" } });
    try { await history().expect(403); }
    finally { await prisma.user.update({ where: { id: admin }, data: { role: "ADMIN" } }); }
  });

  test("records moderator bans, unbans and admin role changes without credentials", async () => {
    const target = await account();
    await request(app).patch(`/admin/users/${target.id}/ban`).set("Authorization", moderatorToken).send({ duration: "1h", reason: "Repeated spam" }).expect(200);
    await request(app).patch(`/admin/users/${target.id}/unban`).set("Authorization", moderatorToken).expect(200);
    await request(app).patch(`/admin/users/${target.id}/role`).set("Authorization", adminToken).send({ role: "MODERATOR" }).expect(200);
    const rows = await prisma.auditEntry.findMany({ where: { targetId: target.id }, orderBy: { createdAt: "asc" } });
    expect(rows.map(row => row.action)).toEqual(["USER_BANNED", "USER_UNBANNED", "USER_ROLE_CHANGED"]);
    expect(rows[0]).toMatchObject({ actorId: moderator, actorRole: "MODERATOR", targetLabel: target.name,
      details: { after: { banReason: "Repeated spam" } } });
    expect(rows[2].details).toEqual({ before: { role: "USER" }, after: { role: "MODERATOR" } });
    const serialized = JSON.stringify(rows);
    for (const secret of [target.email, "password", "googleId", "Bearer"]) expect(serialized).not.toContain(secret);
    const count = rows.length;
    await request(app).patch(`/admin/users/${target.id}/role`).set("Authorization", adminToken).send({ role: "MODERATOR" }).expect(200);
    await request(app).patch(`/admin/users/${target.id}/ban`).set("Authorization", memberToken).send({ duration: "1h" }).expect(403);
    expect(await prisma.auditEntry.count({ where: { targetId: target.id } })).toBe(count);
  });

  test("event edits, cancellations and deletion persist after the target and actor are deleted", async () => {
    const actor = await account("MODERATOR");
    const actorToken = `Bearer ${generateToken(actor.id)}`;
    const target = await event(member);
    await request(app).put(`/admin/events/${target.id}`).set("Authorization", actorToken).send({ name: "Renamed audit event", visibility: "INVITE_ONLY" }).expect(200);
    await request(app).post(`/admin/events/${target.id}/cancel`).set("Authorization", actorToken).send({}).expect(200);
    await request(app).post(`/admin/events/${target.id}/cancel`).set("Authorization", actorToken).send({}).expect(200);
    await request(app).delete(`/admin/events/${target.id}`).set("Authorization", actorToken).expect(200);
    await request(app).delete(`/admin/users/${actor.id}`).set("Authorization", adminToken).expect(200);
    const rows = await prisma.auditEntry.findMany({ where: { targetId: target.id }, orderBy: { createdAt: "asc" } });
    expect(rows.map(row => row.action)).toEqual(["EVENT_UPDATED", "EVENT_CANCELLED", "EVENT_DELETED"]);
    expect(rows[0].details).toMatchObject({ changes: { name: { before: "Audit event", after: "Renamed audit event" }, visibility: { before: "PUBLIC", after: "INVITE_ONLY" } } });
    expect(rows.every(row => row.actorName === actor.name && row.actorRole === "MODERATOR")).toBe(true);
    expect(await prisma.event.findUnique({ where: { id: target.id } })).toBeNull();
    expect(await prisma.auditEntry.findFirst({ where: { action: "USER_DELETED", targetId: actor.id } })).toMatchObject({ targetLabel: actor.name });
  });

  test("records primary category changes even when the selected set is unchanged", async () => {
    const film = await prisma.category.findFirstOrThrow({ where: { name: "Film", isCustom: false } });
    const target = await event(member, { categories: { connect: [{ id: categoryId }, { id: film.id }] } });
    const payload = { categoryIds: [film.id, categoryId] };
    await request(app).put(`/admin/events/${target.id}`).set("Authorization", moderatorToken).send(payload).expect(200);
    const row = await prisma.auditEntry.findFirstOrThrow({ where: { targetId: target.id } });
    expect(row.details).toMatchObject({ changes: { categoryId: { before: categoryId, after: film.id } } });
    await request(app).put(`/admin/events/${target.id}`).set("Authorization", moderatorToken).send(payload).expect(200);
    expect(await prisma.auditEntry.count({ where: { targetId: target.id } })).toBe(1);
  });

  test("records series scope and all affected occurrences", async () => {
    const root = await event(member, { isRecurring: true, recurrencePattern: "DAILY" });
    const child = await event(member, { isRecurring: true, recurrencePattern: "DAILY", parentEventId: root.id });
    await request(app).post(`/admin/events/${child.id}/cancel`).set("Authorization", moderatorToken).send({ scope: "SERIES" }).expect(200);
    const row = await prisma.auditEntry.findFirstOrThrow({ where: { targetId: child.id, action: "EVENT_CANCELLED" } });
    expect(row.details).toMatchObject({ scope: "SERIES", stoppedSeries: true, cancelledEventIds: expect.arrayContaining([root.id, child.id]) });
  });

  test("records comment removals and report decisions, but not ordinary author deletion", async () => {
    const target = await event(member);
    const comment = () => prisma.eventComment.create({ data: { eventId: target.id, userId: member, body: "Fictional comment" } });
    const own = await comment();
    await request(app).delete(`/events/${target.id}/comments/${own.id}`).set("Authorization", memberToken).expect(200);
    expect(await prisma.auditEntry.count({ where: { targetId: own.id } })).toBe(0);
    const removed = await comment();
    await request(app).delete(`/events/${target.id}/comments/${removed.id}`).set("Authorization", moderatorToken).expect(200);
    expect(await prisma.auditEntry.findFirst({ where: { targetId: removed.id } })).toMatchObject({ action: "COMMENT_REMOVED", actorId: moderator });
    for (const action of ["REMOVE", "DISMISS"]) {
      const reported = await comment();
      const report = await prisma.commentReport.create({ data: { commentId: reported.id, reporterId: admin, reason: "SPAM", bodySnapshot: reported.body } });
      await request(app).patch(`/admin/comment-reports/${report.id}`).set("Authorization", moderatorToken).send({ action }).expect(200);
      await request(app).patch(`/admin/comment-reports/${report.id}`).set("Authorization", moderatorToken).send({ action }).expect(409);
      expect(await prisma.auditEntry.count({ where: { targetId: report.id } })).toBe(1);
      expect(await prisma.auditEntry.findFirst({ where: { targetId: report.id } })).toMatchObject({ action: action === "REMOVE" ? "REPORT_REMOVED" : "REPORT_DISMISSED" });
    }
  });

  test("filters and paginates stable newest-first history and validates input", async () => {
    const actor = await account("MODERATOR");
    await prisma.auditEntry.createMany({ data: Array.from({ length: 23 }, (_, index) => ({
      actorId: actor.id, actorName: actor.name, actorRole: "MODERATOR" as const, action: "USER_UNBANNED" as const,
      targetType: "USER", targetId: member, targetLabel: `Audit page ${index}`, details: {}, createdAt: new Date("2026-01-02T12:00:00Z"),
    })) });
    const query = { actor: actor.id, action: "USER_UNBANNED", from: "2026-01-02", to: "2026-01-02" };
    const first = (await history({ ...query, page: 1 }).expect(200)).body;
    const second = (await history({ ...query, page: 2 }).expect(200)).body;
    expect(first).toMatchObject({ total: 23, pageSize: 20, totalPages: 2 });
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(3);
    expect(new Set([...first.items, ...second.items].map(item => item.id)).size).toBe(23);
    expect((await history({ ...query, from: "2026-01-03", to: "2026-01-03" })).body.total).toBe(0);
    for (const invalid of [{ action: "INVALID" }, { from: "bad" }, { from: "2026-02-02", to: "2026-01-01" }, { page: 0 }]) await history(invalid).expect(400);
    await request(app).delete(`/admin/audit-history/${first.items[0].id}`).set("Authorization", adminToken).expect(404);
  });

  test("rolls back the moderation action when audit insertion fails", async () => {
    const target = await account();
    const actor = await account("MODERATOR");
    await prisma.user.update({ where: { id: actor.id }, data: { name: "Audit Rollback Staff" } });
    await prisma.$executeRaw`ALTER TABLE "AuditEntry" ADD CONSTRAINT "audit_test_failure" CHECK ("actorName" <> 'Audit Rollback Staff') NOT VALID`;
    try {
      await request(app).patch(`/admin/users/${target.id}/ban`).set("Authorization", `Bearer ${generateToken(actor.id)}`).send({ duration: "1h" }).expect(500);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).bannedUntil).toBeNull();
      expect(await prisma.auditEntry.count({ where: { targetId: target.id } })).toBe(0);
    } finally { await prisma.$executeRaw`ALTER TABLE "AuditEntry" DROP CONSTRAINT "audit_test_failure"`; }
  });
});
