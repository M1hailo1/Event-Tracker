import { Request, Response } from "express";
import prisma from "../prisma";

export async function getMyProfile(req: Request, res: Response) {
  const userId = req.userId!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json(user);
}

export async function getMyStats(req: Request, res: Response) {
  const userId = req.userId!;

  const registrations = await prisma.registration.findMany({
    where: { userId, status: "CONFIRMED" },
    include: { event: { include: { category: true } } },
  });

  const categoryCounts: Record<
    string,
    { categoryId: string; name: string; count: number }
  > = {};

  for (const reg of registrations) {
    const catId = reg.event.categoryId;
    if (!categoryCounts[catId]) {
      categoryCounts[catId] = {
        categoryId: catId,
        name: reg.event.category.name,
        count: 0,
      };
    }
    categoryCounts[catId].count++;
  }

  const sorted = Object.values(categoryCounts).sort(
    (a, b) => b.count - a.count,
  );

  res.status(200).json({
    totalEvents: registrations.length,
    categoryCounts: sorted,
    topCategory: sorted[0] ?? null,
  });
}
