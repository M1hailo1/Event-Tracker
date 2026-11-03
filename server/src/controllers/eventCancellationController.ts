import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { isStaff } from "../utils/roles";
import { lockEventSeries } from "../utils/eventSeries";

const schema = z.object({ scope: z.enum(["OCCURRENCE", "SERIES"]).default("OCCURRENCE") });

export async function cancelEvent(req: Request, res: Response) {
  return performCancellation(req, res, false);
}

export async function cancelEventAdmin(req: Request, res: Response) {
  return performCancellation(req, res, true);
}

async function performCancellation(req: Request, res: Response, staffTools: boolean) {
  const id = req.params.id;
  const parsed = schema.safeParse(req.body ?? {});
  if (typeof id !== "string" || !parsed.success) return res.status(400).json({ error: "Choose this occurrence or the whole series" });
  try {
    const event = await prisma.$transaction(async tx => {
      const rootId = await lockEventSeries(tx, id);
      if (!rootId) throw Error("NOT_FOUND");
      await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.event.findUnique({ where: { id } });
      if (!current) throw Error("NOT_FOUND");
      const actor = await tx.user.findUnique({ where: { id: req.userId! }, select: { role: true } });
      if (current.createdByUserId !== req.userId && (!staffTools || !isStaff(actor?.role))) throw Error("FORBIDDEN");
      if (parsed.data.scope === "SERIES" && !current.isRecurring) throw Error("NOT_RECURRING");
      if (current.cancelledAt && parsed.data.scope === "OCCURRENCE") return current;
      const now = new Date();
      if (!current.cancelledAt && (current.endDate ?? current.date) <= now) throw Error("ENDED");
      let ids = [id];
      if (parsed.data.scope === "SERIES") {
        const series = await tx.$queryRaw<{ id: string }[]>`
          WITH RECURSIVE series AS (
            SELECT "id" FROM "Event" WHERE "id" = ${rootId}
            UNION
            SELECT child."id" FROM "Event" child JOIN series parent ON child."parentEventId" = parent."id"
          ) SELECT * FROM series`;
        ids = series.map(item => item.id);
        await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ANY(${ids}::text[]) ORDER BY "id" FOR UPDATE`;
        await tx.event.updateMany({ where: { id: { in: ids } }, data: { recurrenceStopped: true } });
      }
      const affected = await tx.event.findMany({ where: { id: { in: ids }, cancelledAt: null,
        OR: [{ endDate: { gt: now } }, { endDate: null, date: { gt: now } }] },
        include: { registrations: { where: { status: "CONFIRMED" }, select: { userId: true } } } });
      for (const target of affected) {
        await tx.event.update({ where: { id: target.id }, data: { cancelledAt: now } });
        await tx.notification.deleteMany({ where: { eventId: target.id, type: "EVENT_REMINDER" } });
        const recipients = target.registrations.filter(registration => registration.userId !== req.userId);
        if (recipients.length) await tx.notification.createMany({ data: recipients.map(registration => ({
          userId: registration.userId, type: "EVENT_CANCELLED" as const,
          message: `The event "${target.name}" has been cancelled`, eventId: target.id,
        })) });
      }
      return tx.event.findUniqueOrThrow({ where: { id } });
    });
    return res.status(200).json(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const errors: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Event not found"], FORBIDDEN: [403, "Only the organizer or staff can cancel this event"],
      NOT_RECURRING: [400, "This event is not recurring"], ENDED: [409, "An ended event cannot be cancelled"],
    };
    const known = errors[message];
    if (known) return res.status(known[0]).json({ error: known[1] });
    throw err;
  }
}
