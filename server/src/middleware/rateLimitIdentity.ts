import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import { verifyToken } from "../utils/jwt";

// Called after a cheap IP ceiling. Only a verified token can trigger a role lookup.
export async function resolveRateLimitIdentity(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return next();
  try {
    const { userId } = verifyToken(authorization.slice(7));
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, bannedUntil: true, banReason: true } });
    if (user) req.currentUser = user;
  } catch {
    // Invalid tokens/database failures never receive a privileged rate budget.
  }
  next();
}
