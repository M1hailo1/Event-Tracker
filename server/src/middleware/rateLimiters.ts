import rateLimit, { ipKeyGenerator } from "express-rate-limit";

function actionLimiter(limit: number, action: string) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit,
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

export const followLimiter = actionLimiter(20, "follow/unfollow actions");
export const registrationLimiter = actionLimiter(20, "join/leave actions");
export const inviteLimiter = actionLimiter(20, "invitations");
export const eventWriteLimiter = actionLimiter(10, "event changes");

export const commentWriteLimiter = actionLimiter(20, "comment changes");

export const commentPostLimiter = actionLimiter(5, "comments or replies");
export const commentReportLimiter = actionLimiter(5, "comment reports");
