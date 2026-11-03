import { readPagination, paged } from "../utils/pagination";
import { Request, Response } from "express";
import prisma from "../prisma";
import { createNotification } from "../utils/createNotification";

export async function followUser(req: Request, res: Response) {
  const targetUserId = req.params.userId;
  if (!targetUserId || typeof targetUserId !== "string") {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const followerId = req.userId!;

  if (followerId === targetUserId) {
    return res.status(400).json({ error: "You cannot follow yourself" });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId, followingId: targetUserId },
    },
  });

  if (existing) {
    return res.status(409).json({ error: "Already following this user" });
  }

  const follow = await prisma.follow.create({
    data: { followerId, followingId: targetUserId },
  });

  const follower = await prisma.user.findUnique({ where: { id: followerId } });

  await createNotification(
    targetUserId,
    "NEW_FOLLOWER",
    `${follower?.name} started following you`,
  );

  res.status(201).json(follow);
}

export async function unfollowUser(req: Request, res: Response) {
  const targetUserId = req.params.userId;
  if (!targetUserId || typeof targetUserId !== "string") {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const followerId = req.userId!;

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId, followingId: targetUserId },
    },
  });

  if (!existing) {
    return res.status(404).json({ error: "You are not following this user" });
  }

  await prisma.follow.delete({
    where: {
      followerId_followingId: { followerId, followingId: targetUserId },
    },
  });

  res.status(200).json({ message: "Unfollowed successfully" });
}

export async function getFollowers(req: Request, res: Response) {
  const userId = req.params.userId;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const paging = req.query.page !== undefined ? readPagination(req, res) : undefined;
  if (paging === null) return;
  const followers = await prisma.follow.findMany({
    where: { followingId: userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(paging ? { skip: paging.skip, take: paging.take } : {}),
    include: { follower: { select: { id: true, name: true } } },
  });

  const items = followers.map(f => f.follower);
  const isFollowing = req.userId ? !!(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: req.userId, followingId: userId } } })) : false;
  res.status(200).json(paging ? { ...paged(items, await prisma.follow.count({ where: { followingId: userId } }), paging), isFollowing } : items);
}

export async function getFollowing(req: Request, res: Response) {
  const userId = req.params.userId;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const paging = req.query.page !== undefined ? readPagination(req, res) : undefined;
  if (paging === null) return;
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(paging ? { skip: paging.skip, take: paging.take } : {}),
    include: { following: { select: { id: true, name: true } } },
  });

  const items = following.map(f => f.following);
  const isFollowing = req.userId ? !!(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: req.userId, followingId: userId } } })) : false;
  res.status(200).json(paging ? { ...paged(items, await prisma.follow.count({ where: { followerId: userId } }), paging), isFollowing } : items);
}
