import { readPagination, paged } from "../utils/pagination";
import { recordAudit } from "../utils/auditHistory";
import { z } from "zod";
import { validUpdatedDates } from "../utils/eventLifecycle";
import { selectedCategoryIds, validCategorySelection, curatedCategoryWhere } from "../utils/eventCategories";
import { Request, Response } from "express";
import prisma from "../prisma";
import { updateEventSchema } from "./eventController";
import { notifyEventRegistrations, notificationTransactionOptions } from "../utils/bulkNotifications";
import { computeBannedUntil, type BanDuration } from "../utils/banDuration";

const VALID_DURATIONS: BanDuration[] = ["1h", "1w", "1m", "forever"];

async function canManageAccount(actorId: string, targetRole: string) {
  if (targetRole !== "ADMIN") return true;
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
  return actor?.role === "ADMIN";
}

export async function getAdminStats(req: Request, res: Response) {
  const [userCount, eventCount, upcomingEventCount, registrationCount, categoryCount, adminCount, moderatorCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.event.count({ where: { date: { gte: new Date() } } }),
      prisma.registration.count({ where: { status: "CONFIRMED" } }),
      prisma.category.count({ where: curatedCategoryWhere }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "MODERATOR" } }),
    ]);

  res.status(200).json({
    userCount,
    eventCount,
    upcomingEventCount,
    registrationCount,
    categoryCount,
    adminCount,
    moderatorCount,
  });
}

export async function getAllUsersAdmin(req: Request, res: Response) {
  const paging = req.query.page !== undefined ? readPagination(req, res) : undefined;
  if (paging === null) return;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const where: any = {};
  if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }];
  if (["USER", "MODERATOR", "ADMIN"].includes(String(req.query.role))) where.role = req.query.role;
  if (req.query.status === "banned") where.bannedUntil = { gt: new Date() };
  if (req.query.status === "active") where.AND = [{ OR: [{ bannedUntil: null }, { bannedUntil: { lte: new Date() } }] }];
  const users = await prisma.user.findMany({
    where,
    ...(paging ? { skip: paging.skip, take: paging.take } : {}),
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bannedUntil: true,
      banReason: true,
      createdAt: true,
      _count: {
        select: { events: true, registrations: true },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  res.status(200).json(paging ? paged(users, await prisma.user.count({ where }), paging) : users);
}

export async function banUserAdmin(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (id === req.userId) {
    return res.status(400).json({ error: "You can't ban your own account" });
  }

  const duration = req.body.duration;
  if (!VALID_DURATIONS.includes(duration)) {
    return res.status(400).json({
      error: "duration must be one of: 1h, 1w, 1m, forever",
    });
  }

  const reason = req.body.reason;
  if (reason !== undefined && (typeof reason !== "string" || reason.trim().length > 500)) {
    return res.status(400).json({ error: "Ban reason must be text with at most 500 characters" });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (!(await canManageAccount(req.userId!, user.role))) {
    return res.status(403).json({ error: "Moderators cannot manage admin accounts" });
  }

  const bannedUntil = computeBannedUntil(duration);

  const updatedUser = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
    const before = await tx.user.findUniqueOrThrow({ where: { id }, select: { bannedUntil: true, banReason: true } });
    const updated = await tx.user.update({
      where: { id },
      data: { bannedUntil, banReason: reason?.trim() || null },
      select: { id: true, name: true, email: true, role: true, bannedUntil: true, banReason: true },
    });

    await recordAudit(tx, req.userId!, "USER_BANNED", "USER", id, updated.name, {
      before: { bannedUntil: before.bannedUntil?.toISOString() ?? null, banReason: before.banReason },
      after: { bannedUntil: bannedUntil.toISOString(), banReason: updated.banReason },
    });
    return updated;
  });
  res.status(200).json(updatedUser);
}

export async function unbanUserAdmin(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (!(await canManageAccount(req.userId!, user.role))) {
    return res.status(403).json({ error: "Moderators cannot manage admin accounts" });
  }

  const updatedUser = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
    const before = await tx.user.findUniqueOrThrow({ where: { id }, select: { bannedUntil: true, banReason: true } });
    const updated = await tx.user.update({
      where: { id },
      data: { bannedUntil: null, banReason: null },
      select: { id: true, name: true, email: true, role: true, bannedUntil: true, banReason: true },
    });

    if (before.bannedUntil || before.banReason) await recordAudit(tx, req.userId!, "USER_UNBANNED", "USER", id, updated.name, {
      before: { bannedUntil: before.bannedUntil?.toISOString() ?? null, banReason: before.banReason },
      after: { bannedUntil: null, banReason: null },
    });
    return updated;
  });
  res.status(200).json(updatedUser);
}

export async function deleteUserAdmin(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (id === req.userId) {
    return res
      .status(400)
      .json({ error: "You can't delete your own account" });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (!(await canManageAccount(req.userId!, user.role))) {
    return res.status(403).json({ error: "Moderators cannot manage admin accounts" });
  }

  const ownedEvents = await prisma.event.findMany({
    where: { createdByUserId: id },
    select: { id: true },
  });
  const ownedEventIds = ownedEvents.map((e) => e.id);

  await prisma.$transaction(async tx => {
    await recordAudit(tx, req.userId!, "USER_DELETED", "USER", id, user.name, { role: user.role, ownedEventIds });
    await tx.notification.deleteMany({ where: { userId: id } });
    await tx.eventInvite.deleteMany({ where: { invitedUserId: id } });
    await tx.follow.deleteMany({
      where: { OR: [{ followerId: id }, { followingId: id }] },
    });
    await tx.registration.deleteMany({
      where: { OR: [{ userId: id }, { eventId: { in: ownedEventIds } }] },
    });
    await tx.eventInvite.deleteMany({
      where: { eventId: { in: ownedEventIds } },
    });
    await tx.event.deleteMany({ where: { id: { in: ownedEventIds } } });
    await tx.user.delete({ where: { id } });
  });

  res.status(200).json({ message: "User successfully deleted" });
}

export async function getAllEventsAdmin(req: Request, res: Response) {
  const paging = req.query.page !== undefined ? readPagination(req, res) : undefined;
  if (paging === null) return;
  const where: any = {};
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { createdBy: { name: { contains: search, mode: "insensitive" } } }];
  if (typeof req.query.event === "string" && req.query.event) where.id = req.query.event;
  if (typeof req.query.categoryId === "string" && req.query.categoryId) where.AND = [{ OR: [{ categoryId: req.query.categoryId }, { categories: { some: { id: req.query.categoryId } } }] }];
  if (["PUBLIC", "FOLLOWERS_ONLY", "INVITE_ONLY"].includes(String(req.query.visibility))) where.visibility = req.query.visibility;
  const events = await prisma.event.findMany({
    where,
    ...(paging ? { skip: paging.skip, take: paging.take } : {}),
    include: {
      category: true,
      categories: true,
      createdBy: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  res.status(200).json(paging ? paged(events, await prisma.event.count({ where }), paging) : events);
}

export async function updateEventAdmin(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return res.status(404).json({ error: "Event not found" });
  }

  const parseResult = updateEventSchema.safeParse(req.body);
  if (existingEvent.cancelledAt) return res.status(409).json({ error: "Cancelled events cannot be edited" });
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const data = parseResult.data;

  if (!validUpdatedDates(existingEvent, data)) return res.status(400).json({ error: "End date must be after the start date" });

  const categoryIds = selectedCategoryIds(data);
  if (!await validCategorySelection(categoryIds)) return res.status(400).json({ error: "Choose categories from the collection" });

  const updatedEvent = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${id} FOR UPDATE`;
    const before = await tx.event.findUniqueOrThrow({ where: { id }, include: { categories: { select: { id: true } } } });
    if (before.cancelledAt || !validUpdatedDates(before, data)) return null;
    const updated = await tx.event.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.coverId !== undefined && { coverId: data.coverId }),
        ...(data.description !== undefined && { description: data.description }),
        ...(categoryIds && { categoryId: categoryIds[0]!, categories: { set: categoryIds.map(id => ({ id })) } }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.maxCapacity !== undefined && { maxCapacity: data.maxCapacity }),
        ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
        ...(data.recurrencePattern !== undefined && {
          recurrencePattern: data.recurrencePattern,
        }),
        ...(data.visibility !== undefined && {
          visibility: data.visibility,
        }),
      },
    });

    const changes: Record<string, { before: string | number | boolean | null; after: string | number | boolean | null }> = {};
    for (const field of Object.keys(data)) {
      if (field === "categoryIds" || field === "categoryId") continue;
      const key = field as keyof typeof updated;
      const oldValue = before[key] instanceof Date ? (before[key] as Date).toISOString() : before[key];
      const newValue = updated[key] instanceof Date ? (updated[key] as Date).toISOString() : updated[key];
      if (oldValue !== newValue) changes[field] = { before: oldValue, after: newValue };
    }
    const oldCategories = before.categories.map(category => category.id).sort();
    const newCategories = categoryIds ? [...categoryIds].sort() : oldCategories;
    if (before.categoryId !== updated.categoryId) changes.categoryId = { before: before.categoryId, after: updated.categoryId };
    if (Object.keys(changes).length || JSON.stringify(oldCategories) !== JSON.stringify(newCategories)) {
      await recordAudit(tx, req.userId!, "EVENT_UPDATED", "EVENT", id, updated.name, {
        changes, ...(categoryIds && { categories: { before: oldCategories, after: newCategories } }),
      });
    }
    await notifyEventRegistrations(tx, id, "EVENT_UPDATED", `The event "${updated.name}" you're registered for has been updated`);
    return updated;
  }, notificationTransactionOptions);

  if (!updatedEvent) return res.status(409).json({ error: "This event changed. Refresh before editing it." });

  res.status(200).json(updatedEvent);
}

export async function deleteEventAdmin(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return res.status(404).json({ error: "Event not found" });
  }

  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${id} FOR UPDATE`;
    const current = await tx.event.findUniqueOrThrow({ where: { id } });
    await notifyEventRegistrations(tx, id, "EVENT_CANCELLED", `The event "${current.name}" you were registered for was permanently deleted by staff`, undefined, false);
    await recordAudit(tx, req.userId!, "EVENT_DELETED", "EVENT", id, current.name, {
      organizerId: current.createdByUserId, date: current.date.toISOString(), visibility: current.visibility,
    });
    await tx.registration.deleteMany({ where: { eventId: id } });
    await tx.eventInvite.deleteMany({ where: { eventId: id } });
    await tx.event.delete({ where: { id } });
  }, notificationTransactionOptions);

  res.status(200).json({ message: "Event successfully deleted" });
}

// Only USER <-> MODERATOR transitions are available through the application.
export async function setModeratorRole(req: Request, res: Response) {
  const parsed = z.object({ role: z.enum(["USER", "MODERATOR"]) }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose USER or MODERATOR" });
  const id = req.params.id as string;
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
    const before = await tx.user.findUnique({ where: { id } });
    const result = await tx.user.updateMany({
      where: { id, role: { in: ["USER", "MODERATOR"] } },
      data: { role: parsed.data.role },
    });
    if (result.count && before && before.role !== parsed.data.role) await recordAudit(tx, req.userId!, "USER_ROLE_CHANGED", "USER", id, before.name, {
      before: { role: before.role }, after: { role: parsed.data.role },
    });
    return result;
  });
  if (!result.count) {
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    return res.status(target ? 403 : 404).json({ error: target ? "Admin roles cannot be changed here" : "User not found" });
  }
  const updated = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  res.json(updated);
}
