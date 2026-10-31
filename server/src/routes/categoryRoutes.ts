import { Router } from "express";
import {
  getAllCategories,
  createCategory,
  getCategoryById,
} from "../controllers/categoryController";
import { requireAuth } from "../middleware/authMiddleware";
import { categoryWriteLimiter } from "../middleware/rateLimiters";

const router = Router();

router.get("/", getAllCategories);
router.post("/", requireAuth, categoryWriteLimiter, createCategory);
router.get("/:id", getCategoryById);

export default router;
