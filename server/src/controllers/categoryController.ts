import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma";

export async function getAllCategories(req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    where: { isCustom: false },
    orderBy: { name: "asc" },
  });

  res.status(200).json(categories);
}

export async function getCategoryById(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }
  res.status(200).json(category);
}

const createCategorySchema = z.object({
  name: z.string().min(2),
});

export async function createCategory(req: Request, res: Response) {
  const parseResult = createCategorySchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const { name } = parseResult.data;

  const category = await prisma.category.create({
    data: {
      name,
      isCustom: true,
      createdByUserId: req.userId!,
    },
  });

  res.status(201).json(category);
}
