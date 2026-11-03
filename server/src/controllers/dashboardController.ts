import { withEventRatings } from "../utils/ratings";
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

export async function getMyDashboard(req: Request, res: Response) {
  const userId = req.userId!;
  const now = new Date();

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
    ...myUpcomingEvents, ...registeredUpcomingEvents, ...followingUpcomingEvents,
  ]);
  const byId = new Map(ratedEvents.map(event => [event.id, event]));
  res.status(200).json({
    hasMore: {
      myUpcomingEvents: myUpcomingEvents.length > UPCOMING_LIMIT,
      registeredUpcomingEvents: registeredUpcomingEvents.length > UPCOMING_LIMIT,
      followingUpcomingEvents: followingUpcomingEvents.length > UPCOMING_LIMIT,
    },
    myUpcomingEvents: myUpcomingEvents.slice(0, UPCOMING_LIMIT).map(event => byId.get(event.id)),
    registeredUpcomingEvents: registeredUpcomingEvents.slice(0, UPCOMING_LIMIT).map(event => byId.get(event.id)),
    followingUpcomingEvents: followingUpcomingEvents.slice(0, UPCOMING_LIMIT).map(event => byId.get(event.id)),
  });
}
