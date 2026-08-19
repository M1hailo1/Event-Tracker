import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";

export async function registerForEvent(req: Request, res: Response) {
  const eventId = req.params.id;
  if (!eventId || typeof eventId !== "string") {
    return res.status(400).json({ error: "Invalid event ID" });
  }

  const userId = req.userId!;

  try {
    const registration = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: {
          _count: {
            select: { registrations: { where: { status: "CONFIRMED" } } },
          },
        },
      });

      if (!event) {
        throw new Error("EVENT_NOT_FOUND");
      }

      if (event.date < new Date()) {
        throw new Error("EVENT_ENDED");
      }

      const canView = await userCanAccessEvent(tx, event, userId);
      if (!canView) {
        throw new Error("NO_ACCESS");
      }

      const existing = await tx.registration.findUnique({
        where: { userId_eventId: { userId, eventId } },
      });

      if (existing) {
        throw new Error("ALREADY_REGISTERED");
      }

      if (
        event.maxCapacity !== null &&
        event._count.registrations >= event.maxCapacity
      ) {
        throw new Error("EVENT_FULL");
      }

      return tx.registration.create({
        data: {
          userId,
          eventId,
          status: "CONFIRMED",
        },
      });
    });

    res.status(201).json(registration);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "EVENT_NOT_FOUND") {
        return res.status(404).json({ error: "Event not found" });
      }
      if (err.message === "ALREADY_REGISTERED") {
        return res
          .status(409)
          .json({ error: "You are already registered to this event" });
      }
      if (err.message === "EVENT_FULL") {
        return res.status(409).json({ error: "Event is full" });
      }
      if (err.message === "EVENT_ENDED") {
        return res.status(403).json({ error: "Event already finished" });
      }
      if (err.message === "NO_ACCESS") {
        return res
          .status(403)
          .json({ error: "You don't have access to this event" });
      }
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

async function userCanAccessEvent(
  tx: Prisma.TransactionClient,
  event: { visibility: string; createdByUserId: string; id: string },
  userId: string,
): Promise<boolean> {
  if (event.visibility === "PUBLIC") return true;
  if (event.createdByUserId === userId) return true;

  if (event.visibility === "FOLLOWERS_ONLY") {
    const follow = await tx.follow.findUnique({
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
    const invite = await tx.eventInvite.findUnique({
      where: {
        eventId_invitedUserId: { eventId: event.id, invitedUserId: userId },
      },
    });
    return !!invite;
  }

  return false;
}

export async function unregisterFromEvent(req: Request, res: Response) {
  const eventId = req.params.id;
  if (!eventId || typeof eventId !== "string") {
    return res.status(400).json({ error: "Invalid event ID" });
  }

  const userId = req.userId!;

  const registration = await prisma.registration.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });

  if (!registration) {
    return res
      .status(404)
      .json({ error: "You are not registered to this event" });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (event && event.date < new Date()) {
    return res
      .status(403)
      .json({ error: "You can't unregister from an event that ended" });
  }

  await prisma.registration.delete({
    where: { userId_eventId: { userId, eventId } },
  });

  res.status(200).json({ message: "Successfully unregistered from the event" });
}
