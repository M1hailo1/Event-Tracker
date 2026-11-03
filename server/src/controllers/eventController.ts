import { readPagination, paged } from "../utils/pagination";
import { isStaff } from "../utils/roles";
import { lockEventSeries } from "../utils/eventSeries";
import { activeEventsWhere, endedEventsWhere, validUpdatedDates } from "../utils/eventLifecycle";
import { eventCoverIds } from "../utils/eventCovers";
import { selectedCategoryIds, validCategorySelection } from "../utils/eventCategories";
import { Request, Response } from "express";
import { getRatingSummary, withEventRatings } from "../utils/ratings";
import { z } from "zod";
import prisma from "../prisma";
import { getNextDate } from "../utils/recurrence";
import { createNotification } from "../utils/createNotification";

export const baseEventSchema = z.object({
  coverId: z.enum(eventCoverIds).nullable().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  categoryIds: z.array(z.string().uuid()).min(1).max(3).refine(ids => new Set(ids).size === ids.length, "Choose distinct categories").optional(),
  date: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  location: z.string().min(2),
  latitude: z.number(),
  longitude: z.number(),
  maxCapacity: z.number().int().positive().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrencePattern: z
    .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
    .optional(),
  visibility: z
    .enum(["PUBLIC", "FOLLOWERS_ONLY", "INVITE_ONLY"])
    .optional()
    .default("PUBLIC"),
});

const createEventSchema = baseEventSchema
  .refine(data => !!selectedCategoryIds(data)?.length, { message: "Choose 1 to 3 categories", path: ["categoryIds"] })
  .refine(data => !data.categoryIds || !data.categoryId || data.categoryIds[0] === data.categoryId, { message: "Primary category must be first", path: ["categoryIds"] })
  .refine((data) => new Date(data.date) > new Date(), {
    message: "Event date must be in the future",
    path: ["date"],
  })
  .refine(
    (data) => !data.endDate || new Date(data.endDate) > new Date(data.date),
    { message: "End date must be after the start date", path: ["endDate"] },
  );

export async function createEvent(req: Request, res: Response) {
  const parseResult = createEventSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const data = parseResult.data;

  const categoryIds = selectedCategoryIds(data)!;
  if (!await validCategorySelection(categoryIds)) return res.status(400).json({ error: "Choose categories from the collection" });

  const event = await prisma.event.create({
    data: {
      name: data.name,
      coverId: data.coverId ?? null,
      description: data.description ?? null,
      categoryId: categoryIds[0]!,
      categories: { connect: categoryIds.map(id => ({ id })) },
      date: new Date(data.date),
      endDate: data.endDate ? new Date(data.endDate) : null,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      maxCapacity: data.maxCapacity ?? null,
      isRecurring: data.isRecurring,
      recurrencePattern: data.recurrencePattern ?? null,
      visibility: data.visibility,
      createdByUserId: req.userId!,
      registrations: { create: { userId: req.userId!, status: "CONFIRMED" } },
    },
  });

  const creator = await prisma.user.findUnique({ where: { id: req.userId! } });

  if (data.visibility !== "INVITE_ONLY") {
    const followers = await prisma.follow.findMany({
      where: { followingId: req.userId! },
      select: { followerId: true },
    });

    await Promise.all(
      followers.map((f) =>
        createNotification(
          f.followerId,
          "NEW_EVENT_FROM_FOLLOWED",
          `${creator?.name} created a new event: ${event.name}`,
          event.id,
        ),
      ),
    );
  }

  res.status(201).json(event);
}

export async function getAllEvents(req: Request, res: Response) {
  const paging = req.query.page !== undefined ? readPagination(req, res, 12) : undefined;
  if (paging === null) return;
  await generateMissingRecurringInstances();

  const showPast = req.query.includePast === "true";
  const userId = req.userId;

  const categoryId =
    typeof req.query.categoryId === "string" && req.query.categoryId
      ? req.query.categoryId
      : undefined;
  const city =
    typeof req.query.city === "string" && req.query.city.trim()
      ? req.query.city.trim()
      : undefined;
  const search =
    typeof req.query.search === "string" && req.query.search.trim()
      ? req.query.search.trim()
      : undefined;
  const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "";
  const attendedOnly = req.query.attendedOnly === "true";

  if (attendedOnly && !userId) {
    return res.status(200).json(paging ? paged([], 0, paging) : []);
  }

  const now = new Date();
  const dateFilter = showPast ? { OR: [{ cancelledAt: { not: null } }, endedEventsWhere(now)] } : activeEventsWhere(now);

  const visibilityFilter = userId
    ? {
        OR: [
          { visibility: "PUBLIC" as const },
          { createdByUserId: userId },
          {
            visibility: "FOLLOWERS_ONLY" as const,
            createdBy: { followers: { some: { followerId: userId } } },
          },
          {
            visibility: "INVITE_ONLY" as const,
            invites: { some: { invitedUserId: userId } },
          },
        ],
      }
    : { visibility: "PUBLIC" as const };

  const filters: any[] = [
    dateFilter,
    visibilityFilter,
    {
      createdBy: {
        OR: [{ bannedUntil: null }, { bannedUntil: { lte: new Date() } }],
      },
    },
  ];

  if (categoryId) {
    filters.push({ OR: [{ categoryId }, { categories: { some: { id: categoryId } } }] });
  }
  if (city) {
    filters.push({ location: { contains: city, mode: "insensitive" } });
  }
  if (search) {
    filters.push({ name: { contains: search, mode: "insensitive" } });
  }
  if (attendedOnly) {
    filters.push({ cancelledAt: null });
    filters.push({
      registrations: { some: { userId: userId!, status: "CONFIRMED" } },
    });
  }

  if (typeof req.query.organizerId === "string") filters.push({ createdByUserId: req.query.organizerId });
  const scope = req.query.scope;
  if (scope && !userId) return res.status(401).json({ error: "Sign in required" });
  if (scope === "organized") filters.push({ createdByUserId: userId });
  if (scope === "registered") filters.push({ createdByUserId: { not: userId }, registrations: { some: { userId, status: "CONFIRMED" } } });
  if (scope === "following") filters.push({ createdBy: { followers: { some: { followerId: userId } } }, registrations: { none: { userId } } });
  if (typeof req.query.from === "string" && typeof req.query.to === "string") {
    const from = new Date(req.query.from), to = new Date(req.query.to);
    if (!Number.isFinite(+from) || !Number.isFinite(+to) || from >= to) return res.status(400).json({ error: "Invalid date range" });
    filters.push({ date: { gte: from, lt: to } });
  }
  let orderBy: { date: "asc" | "desc" } | { name: "asc" | "desc" } = {
    date: showPast ? "desc" : "asc",
  };
  if (sortBy === "date_asc") orderBy = { date: "asc" };
  else if (sortBy === "date_desc") orderBy = { date: "desc" };
  else if (sortBy === "name_asc") orderBy = { name: "asc" };
  else if (sortBy === "name_desc") orderBy = { name: "desc" };

  const events = await prisma.event.findMany({
    where: { AND: filters },
    include: {
      category: true,
      categories: true,
      createdBy: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: [orderBy, { id: "asc" }],
    ...(paging ? { skip: paging.skip, take: paging.take } : {}),
  });

  const items = await withEventRatings(events);
  res.status(200).json(paging ? paged(items, await prisma.event.count({ where: { AND: filters } }), paging) : items);
}

export async function getEventById(req: Request, res: Response) {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Nevazeci ID" });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      category: true,
      categories: true,
      createdBy: {
        select: { id: true, name: true },
      },
      registrations: {
        where: { status: "CONFIRMED", userId: req.userId ?? "00000000-0000-0000-0000-000000000000" },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      _count: {
        select: { registrations: true },
      },
    },
  });

  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const canView = await userCanViewEvent(event, req.userId);
  if (!canView) {
    return res
      .status(403)
      .json({ error: "You don't have access to this event" });
  }

  const [rating, myRating] = await Promise.all([
    getRatingSummary({ eventId: id }),
    req.userId ? prisma.eventRating.findUnique({
      where: { userId_eventId: { userId: req.userId, eventId: id } },
      select: { score: true },
    }) : null,
  ]);
  res.status(200).json({ ...event, rating, myRating: myRating?.score ?? null });
}

export async function userCanViewEvent(
  event: { visibility: string; createdByUserId: string; id: string },
  userId: string | undefined,
): Promise<boolean> {
  if (event.visibility === "PUBLIC") return true;
  if (!userId) return false;
  if (event.createdByUserId === userId) return true;

  const requestingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (isStaff(requestingUser?.role)) return true;

  if (event.visibility === "FOLLOWERS_ONLY") {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: event.createdByUserId,
        },
      },
    });
    return !!follow;
  }

  if (event.visibility === "INVITE_ONLY") {
    const invite = await prisma.eventInvite.findUnique({
      where: {
        eventId_invitedUserId: { eventId: event.id, invitedUserId: userId },
      },
    });
    return !!invite;
  }

  return false;
}

export const updateEventSchema = baseEventSchema
  .extend({
    visibility: z.enum(["PUBLIC", "FOLLOWERS_ONLY", "INVITE_ONLY"]).optional(),
    isRecurring: z.boolean().optional(),
  })
  .partial()
  .refine(data => !data.categoryIds || !data.categoryId || data.categoryIds[0] === data.categoryId, { message: "Primary category must be first", path: ["categoryIds"] })
  .refine((data) => !data.date || new Date(data.date) > new Date(), {
    message: "Event date must be in the future",
    path: ["date"],
  });

export async function updateEvent(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return res.status(404).json({ error: "Event not found" });
  }

  if (existingEvent.createdByUserId !== req.userId) {
    return res
      .status(403)
      .json({ error: "You don't have permission to edit this event" });
  }

  if (existingEvent.cancelledAt) return res.status(409).json({ error: "Cancelled events cannot be edited" });

  if (existingEvent.date <= new Date()) {
    return res
      .status(403)
      .json({ error: "You can't edit events that have started" });
  }

  const parseResult = updateEventSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const data = parseResult.data;

  if (!validUpdatedDates(existingEvent, data)) return res.status(400).json({ error: "End date must be after the start date" });

  const categoryIds = selectedCategoryIds(data);
  if (!await validCategorySelection(categoryIds)) return res.status(400).json({ error: "Choose categories from the collection" });

  const updatedEvent = await prisma.event.update({
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

  const registeredUsers = await prisma.registration.findMany({
    where: {
      eventId: id,
      status: "CONFIRMED",
      userId: { not: req.userId! },
    },
    select: { userId: true },
  });

  await Promise.all(
    registeredUsers.map((r) =>
      createNotification(
        r.userId,
        "EVENT_UPDATED",
        `The event "${updatedEvent.name}" you're registered for has been updated`,
        updatedEvent.id,
      ),
    ),
  );

  res.status(200).json(updatedEvent);
}

export async function deleteEvent(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return res.status(404).json({ error: "Event not found" });
  }

  if (existingEvent.createdByUserId !== req.userId) {
    return res
      .status(403)
      .json({ error: "You don't have permission to delete this event" });
  }

  if (existingEvent.date <= new Date()) {
    return res
      .status(403)
      .json({ error: "You can't delete events that have started" });
  }

  const registeredUsers = await prisma.registration.findMany({
    where: {
      eventId: id,
      status: "CONFIRMED",
      userId: { not: req.userId! },
    },
    select: { userId: true },
  });

  await prisma.$transaction([
    prisma.registration.deleteMany({ where: { eventId: id } }),
    prisma.eventInvite.deleteMany({ where: { eventId: id } }),
    prisma.event.delete({ where: { id } }),
  ]);

  await Promise.all(
    registeredUsers.map((r) =>
      createNotification(
        r.userId,
        "EVENT_CANCELLED",
        `The event "${existingEvent.name}" you were registered for was permanently deleted`,
      ),
    ),
  );

  res.status(200).json({ message: "Event successfully deleted" });
}

export async function generateMissingRecurringInstances() {
  const now = new Date();
  const expiredRecurring = await prisma.event.findMany({
    include: { categories: true },
    where: {
      isRecurring: true,
      recurrenceStopped: false,
      AND: [endedEventsWhere(now)],
      nextInstances: { none: {} },
    },
  });

  for (const candidate of expiredRecurring) {
    await prisma.$transaction(async tx => {
      if (!await lockEventSeries(tx, candidate.id)) return;
      const event = await tx.event.findUnique({ where: { id: candidate.id }, include: { categories: true, nextInstances: { select: { id: true }, take: 1 } } });
      if (!event || !event.recurrencePattern || event.recurrenceStopped || event.nextInstances.length || (event.endDate ?? event.date) > now) return;

      let nextDate = getNextDate(event.date, event.recurrencePattern);

      while (nextDate <= now) nextDate = getNextDate(nextDate, event.recurrencePattern);

      await tx.event.create({
        data: {
          name: event.name,
          coverId: event.coverId,
          description: event.description,
          categoryId: event.categoryId,
          categories: { connect: (event.categories?.length ? event.categories : [{ id: event.categoryId }]).map(category => ({ id: category.id })) },
          date: nextDate,
          endDate: event.endDate ? new Date(nextDate.getTime() + (event.endDate.getTime() - event.date.getTime())) : null,
          location: event.location,
          latitude: event.latitude,
          longitude: event.longitude,
          maxCapacity: event.maxCapacity,
          isRecurring: event.isRecurring,
          recurrencePattern: event.recurrencePattern,
          visibility: event.visibility,
          createdByUserId: event.createdByUserId,
          parentEventId: event.id,
        },
      });
    });
  }
}

export async function getEventAttendees(req: Request, res: Response) {
  const id = String(req.params.id);
  const paging = readPagination(req, res);
  if (!paging) return;
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, visibility: true, createdByUserId: true } });
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (!(await userCanViewEvent(event, req.userId))) return res.status(403).json({ error: "You don't have access to this event" });
  const where = { eventId: id, status: "CONFIRMED" as const };
  const items = await prisma.registration.findMany({ where, orderBy: { id: "asc" }, skip: paging.skip, take: paging.take, include: { user: { select: { id: true, name: true } } } });
  res.json(paged(items, await prisma.registration.count({ where }), paging));
}
