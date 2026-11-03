import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      currentUser?: { id: string; role: Role; bannedUntil: Date | null; banReason: string | null };
    }
  }
}

export {};
