import { Request, Response } from "express";
import prisma from "../prisma";

const eventInclude = {
  category: true,
  createdBy: { select: { id: true, name: true } },
  _count: { select: { registrations: true } },
};

const UPCOMING_LIMIT = 6;

export async function getMyDashboard(req: Request, res: Response) {
  const userId = req.userId!;
  const now = new Date();

  const myUpcomingEvents = await prisma.event.findMany({
    where: { createdByUserId: userId, date: { gte: now } },
    include: eventInclude,
    orderBy: { date: "asc" },
    take: UPCOMING_LIMIT,
  });

  const registeredUpcomingEvents = await prisma.event.findMany({
    where: {
      date: { gte: now },
      createdByUserId: { not: userId },
      registrations: { some: { userId, status: "CONFIRMED" } },
    },
    include: eventInclude,
    orderBy: { date: "asc" },
    take: UPCOMING_LIMIT,
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
            date: { gte: now },
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
          take: UPCOMING_LIMIT,
        });

  res.status(200).json({
    myUpcomingEvents,
    registeredUpcomingEvents,
    followingUpcomingEvents,
  });
}
