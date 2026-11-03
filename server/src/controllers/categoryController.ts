import { Request, Response } from "express";
import { curatedCategoryWhere } from "../utils/eventCategories";
import prisma from "../prisma";

export async function getAllCategories(req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    where: curatedCategoryWhere,
    orderBy: { name: "asc" },
  });

  const ordered = [...categories.filter(category => category.name !== "Other"), ...categories.filter(category => category.name === "Other")];
  res.status(200).json(ordered);
}

export async function getCategoryById(req: Request, res: Response) {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const category = await prisma.category.findFirst({ where: { ...curatedCategoryWhere, id } });
  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }
  res.status(200).json(category);
}
