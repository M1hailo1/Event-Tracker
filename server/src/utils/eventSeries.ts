import type { Prisma } from "@prisma/client";

export async function lockEventSeries(tx: Prisma.TransactionClient, eventId: string) {
  const ancestors = await tx.$queryRaw<{ id: string; parentEventId: string | null }[]>`
    WITH RECURSIVE ancestors AS (
      SELECT "id", "parentEventId" FROM "Event" WHERE "id" = ${eventId}
      UNION
      SELECT parent."id", parent."parentEventId" FROM "Event" parent JOIN ancestors child ON parent."id" = child."parentEventId"
    ) SELECT * FROM ancestors`;
  const root = ancestors.find(event => event.parentEventId === null);
  if (!root) return null;
  await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${root.id} FOR UPDATE`;
  return root.id;
}
