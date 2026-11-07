import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { validCategorySelection } from "../utils/eventCategories";

const selectionSchema = z.object({ categoryIds: z.array(z.string().uuid()).max(18).refine(ids => new Set(ids).size === ids.length) }).strict();

export async function getMyInterests(req: Request, res: Response) {
  res.setHeader("Cache-Control", "private, no-store");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! }, select: { interests: { select: { id: true, name: true } } } });
  res.json(user.interests);
}

export async function updateMyInterests(req: Request, res: Response) {
  const result = selectionSchema.safeParse(req.body);
  if (!result.success || !await validCategorySelection(result.data.categoryIds)) {
    return res.status(400).json({ error: "Choose valid interests without duplicates." });
  }
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { interests: { set: result.data.categoryIds.map(id => ({ id })) } },
    select: { interests: { select: { id: true, name: true } } },
  });
  res.setHeader("Cache-Control", "private, no-store");
  res.json(user.interests);
}
