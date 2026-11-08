import { withEventRatings } from "../utils/ratings";
import { savedEventsWhere } from "../utils/savedEvents";
import { saveableEventsWhere } from "../utils/savedEvents";
import { endedEventsWhere } from "../utils/eventLifecycle";
import { buildPreferences, rankRecommendations } from "../utils/recommendations";
import { activeEventsWhere } from "../utils/eventLifecycle";
import { Request, Response } from "express";
import prisma from "../prisma";

const eventInclude = {
  category: true,
  categories: true,
  createdBy: { select: { id: true, name: true } },
  _count: { select: { registrations: true } },
};

const UPCOMING_LIMIT = 6;
const DISCOVERY_LIMIT = 3;

export async function getMyDashboard(req: Request, res: Response) {
  const userId = req.userId!;
  const now = new Date();
  res.setHeader("Cache-Control", "private, no-store");
  const [preferencesUser, savedSignals, pastSignals] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { interests: { select: { id: true, name: true } } } }),
    prisma.event.findMany({ where: { AND: [savedEventsWhere(userId, now)], cancelledAt: null, createdByUserId: { not: userId } }, select: { category: true, categories: true }, orderBy: [{ date: "desc" }, { id: "asc" }], take: 100 }),
    prisma.event.findMany({ where: { AND: [saveableEventsWhere(userId, now), endedEventsWhere(now)], cancelledAt: null, createdByUserId: { not: userId }, registrations: { some: { userId, status: "CONFIRMED" } } }, select: { category: true, categories: true }, orderBy: [{ date: "desc" }, { id: "asc" }], take: 100 }),
  ]);
  const preferences = buildPreferences(preferencesUser.interests, savedSignals, pastSignals);
  const eligibleWhere = { AND: [saveableEventsWhere(userId, now)], date: { gt: now }, cancelledAt: null, createdByUserId: { not: userId }, registrations: { none: { userId, status: "CONFIRMED" as const } } };
  const matchingEvents = preferences.size ? await prisma.event.findMany({
    where: { ...eligibleWhere, OR: [{ categoryId: { in: [...preferences.keys()] } }, { categories: { some: { id: { in: [...preferences.keys()] } } } }] },
    include: eventInclude,
    orderBy: [{ date: "asc" }, { id: "asc" }],
  }) : [];
  const recommendedEvents = rankRecommendations(matchingEvents, preferences).slice(0, DISCOVERY_LIMIT);
  const exploreEvents = await prisma.event.findMany({
    where: { ...eligibleWhere, id: { notIn: recommendedEvents.map(event => event.id) }, categoryId: { notIn: [...preferences.keys()] }, categories: { none: { id: { in: [...preferences.keys()] } } } },
    include: eventInclude, orderBy: [{ date: "asc" }, { id: "asc" }], take: DISCOVERY_LIMIT,
  });
  const savedUpcomingEvents = await prisma.event.findMany({
    where: { AND: [savedEventsWhere(userId, now), activeEventsWhere(now)] },
    include: eventInclude,
    orderBy: [{ date: "asc" }, { id: "asc" }],
    take: UPCOMING_LIMIT + 1,
  });

  const myUpcomingEvents = await prisma.event.findMany({
    where: { createdByUserId: userId, AND: [activeEventsWhere(now)] },
    include: eventInclude,
    orderBy: { date: "asc" },
    take: UPCOMING_LIMIT + 1,
  });

  const registeredUpcomingEvents = await prisma.event.findMany({
    where: {
      AND: [activeEventsWhere(now)],
      createdByUserId: { not: userId },
      registrations: { some: { userId, status: "CONFIRMED" } },
    },
    include: eventInclude,
    orderBy: { date: "asc" },
    take: UPCOMING_LIMIT + 1,
  });

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const followingUpcomingEvents =
    followingIds.length === 0
      ? []
      : await prisma.event.findMany({
          where: {
            createdByUserId: { in: followingIds },
            AND: [activeEventsWhere(now)],
            registrations: { none: { userId } },
            OR: [
              { visibility: "PUBLIC" },
              { visibility: "FOLLOWERS_ONLY" },
              {
                visibility: "INVITE_ONLY",
                invites: { some: { invitedUserId: userId } },
              },
            ],
          },
          include: eventInclude,
          orderBy: { date: "asc" },
          take: UPCOMING_LIMIT + 1,
        });

  const ratedEvents = await withEventRatings([
    ...myUpcomingEvents, ...registeredUpcomingEvents, ...followingUpcomingEvents, ...savedUpcomingEvents,
    ...recommendedEvents, ...exploreEvents,
  ]);
  const byId = new Map(ratedEvents.map(event => [event.id, event]));
  res.status(200).json({
    recommendedEvents: recommendedEvents.map(event => ({ ...byId.get(event.id), recommendationReason: event.recommendationReason })),
    exploreEvents: exploreEvents.map(event => byId.get(event.id)),
    hasMore: {
      savedUpcomingEvents: savedUpcomingEvents.length > UPCOMING_LIMIT,
      myUpcomingEvents: myUpcomingEvents.length > UPCOMING_LIMIT,
      registeredUpcomingEvents: registeredUpcomingEvents.length > UPCOMING_LIMIT,
      followingUpcomingEvents: followingUpcomingEvents.length > UPCOMING_LIMIT,
    },
    myUpcomingEvents: myUpcomingEvents.slice(0, UPCOMING_LIMIT).map(event => byId.get(event.id)),
    savedUpcomingEvents: savedUpcomingEvents.slice(0, UPCOMING_LIMIT).map(event => byId.get(event.id)),
    registeredUpcomingEvents: registeredUpcomingEvents.slice(0, UPCOMING_LIMIT).map(event => byId.get(event.id)),
    followingUpcomingEvents: followingUpcomingEvents.slice(0, UPCOMING_LIMIT).map(event => byId.get(event.id)),
  });
}
