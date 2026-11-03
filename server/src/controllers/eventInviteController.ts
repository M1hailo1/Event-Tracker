import { readPagination, paged } from "../utils/pagination";
import { Request, Response } from "express";
import prisma from "../prisma";
import { createNotification } from "../utils/createNotification";

export async function inviteUserToEvent(req: Request, res: Response) {
  const eventId = req.params.id;
  if (!eventId || typeof eventId !== "string") {
    return res.status(400).json({ error: "Invalid event ID" });
  }

  const targetUserId = req.body.userId;
  if (!targetUserId || typeof targetUserId !== "string") {
    return res.status(400).json({ error: "userId is required" });
  }

  const requesterId = req.userId!;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }
  if (event.cancelledAt) return res.status(409).json({ error: "Cancelled events cannot accept invitations" });

  if (event.createdByUserId !== requesterId) {
    return res
      .status(403)
      .json({ error: "Only the event creator can invite people" });
  }

  if (event.visibility !== "INVITE_ONLY") {
    return res.status(400).json({ error: "This event is not invite-only" });
  }

  if (targetUserId === requesterId) {
    return res.status(400).json({ error: "You can't invite yourself" });
  }

  // For now, only people who already follow the creator can be invited.
  const isFollower = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: targetUserId,
        followingId: requesterId,
      },
    },
  });

  if (!isFollower) {
    return res
      .status(400)
      .json({ error: "You can only invite your followers right now" });
  }

  const existingInvite = await prisma.eventInvite.findUnique({
    where: {
      eventId_invitedUserId: { eventId, invitedUserId: targetUserId },
    },
  });

  if (existingInvite) {
    return res.status(409).json({ error: "User is already invited" });
  }

  const invite = await prisma.eventInvite.create({
    data: { eventId, invitedUserId: targetUserId },
  });

  const creator = await prisma.user.findUnique({ where: { id: requesterId } });

  await createNotification(
    targetUserId,
    "EVENT_INVITE",
    `${creator?.name} invited you to "${event.name}"`,
    event.id,
  );

  res.status(201).json(invite);
}

export async function getEventInvites(req: Request, res: Response) {
  const eventId = req.params.id;
  if (!eventId || typeof eventId !== "string") {
    return res.status(400).json({ error: "Invalid event ID" });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  if (event.createdByUserId !== req.userId) {
    return res
      .status(403)
      .json({ error: "Only the event creator can view invites" });
  }

  const paging = req.query.page !== undefined ? readPagination(req, res) : undefined;
  if (paging === null) return;
  if (paging && req.query.kind === "available") {
    const where = { followingId: event.createdByUserId, follower: { id: { not: event.createdByUserId }, eventInvites: { none: { eventId } } } };
    const followers = await prisma.follow.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: paging.skip, take: paging.take, include: { follower: { select: { id: true, name: true } } } });
    return res.json(paged(followers.map(item => item.follower), await prisma.follow.count({ where }), paging));
  }
  const invites = await prisma.eventInvite.findMany({
    where: { eventId },
    include: { invitedUser: { select: { id: true, name: true } } },
    orderBy: [{ invitedAt: "desc" }, { id: "desc" }],
    ...(paging ? { skip: paging.skip, take: paging.take } : {}),
  });

  const items = invites.map(i => i.invitedUser);
  res.status(200).json(paging ? paged(items, await prisma.eventInvite.count({ where: { eventId } }), paging) : items);
}
