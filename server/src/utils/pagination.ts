import type { Request, Response } from "express";

export function pagination(req: Request, defaultSize = 20) {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? defaultSize);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) ||
      pageSize < 1 || pageSize > 100 || (page - 1) * pageSize > 2147483647) {
    throw new Error("Invalid pagination");
  }
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function readPagination(req: Request, res: Response, size = 20) {
  try {
    return pagination(req, size);
  } catch {
    res.status(400).json({ error: "Invalid pagination" });
    return null;
  }
}

export function paged<T>(items: T[], total: number, p: { page: number; pageSize: number }) {
  return { items, total, page: p.page, pageSize: p.pageSize, totalPages: Math.ceil(total / p.pageSize) };
}
