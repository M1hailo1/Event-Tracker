import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import { isCurrentlyBanned } from "../utils/banDuration";

export function rateMultiplier(req: Request) {
  const user = req.currentUser;
  if (!user || isCurrentlyBanned(user.bannedUntil)) return 1;
  return user.role === "ADMIN" ? 5 : user.role === "MODERATOR" ? 3 : 1;
}

export function createActionLimiter(limit: number, action: string) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: req => limit * rateMultiplier(req),
    skip: () => process.env.NODE_ENV === "test",
    keyGenerator: (req) =>
      req.userId
        ? `user:${req.userId}`
        : ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "unknown"),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: `Too many ${action}. Please wait a minute and try again.`,
    },
  });
}

export const followLimiter = createActionLimiter(20, "follow/unfollow actions");
export const registrationLimiter = createActionLimiter(20, "join/leave actions");
export const inviteLimiter = createActionLimiter(20, "invitations");
export const eventWriteLimiter = createActionLimiter(10, "event changes");
export const moderationLimiter = createActionLimiter(10, "moderation actions");

export const commentWriteLimiter = createActionLimiter(20, "comment changes");

export const commentPostLimiter = createActionLimiter(5, "comments or replies");
export const commentReportLimiter = createActionLimiter(5, "comment reports");

export function createGeneralLimiter(base = 300) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: req => base * rateMultiplier(req),
    skip: () => process.env.NODE_ENV === "test",
    keyGenerator: req => req.currentUser
      ? `user:${req.currentUser.id}`
      : ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "unknown"),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  });
}
