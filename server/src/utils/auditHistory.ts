import type { AuditAction, Prisma } from "@prisma/client";

export async function recordAudit(tx: Prisma.TransactionClient, actorId: string, action: AuditAction,
  targetType: string, targetId: string, targetLabel: string, details: Prisma.InputJsonObject) {
  const actor = await tx.user.findUniqueOrThrow({ where: { id: actorId }, select: { name: true, role: true } });
  if (actor.role !== "ADMIN" && actor.role !== "MODERATOR") throw new Error("Staff access required");
  await tx.auditEntry.create({ data: { actorId, actorName: actor.name, actorRole: actor.role,
    action, targetType, targetId, targetLabel, details } });
}
