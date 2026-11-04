import type { Prisma } from "@prisma/client";

// Personal discovery never gains access from a saved row or a staff role.
export function savedEventsWhere(userId: string, now = new Date()): Prisma.EventWhereInput {
  return {
    savedBy: { some: { userId } },
    AND: [saveableEventsWhere(userId, now)],
  };
}

export function saveableEventsWhere(userId: string, now = new Date()): Prisma.EventWhereInput {
  return {
    createdBy: { OR: [{ bannedUntil: null }, { bannedUntil: { lte: now } }] },
    OR: [
      { visibility: "PUBLIC" },
      { createdByUserId: userId },
      { visibility: "FOLLOWERS_ONLY", createdBy: { followers: { some: { followerId: userId } } } },
      { visibility: "INVITE_ONLY", invites: { some: { invitedUserId: userId } } },
    ],
  };
}
