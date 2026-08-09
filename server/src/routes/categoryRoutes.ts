import { Router } from "express";
import {
  getAllCategories,
  createCategory,
  getCategoryById,
} from "../controllers/categoryController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.get("/", getAllCategories);
router.post("/", requireAuth, createCategory);
router.get("/:id", getCategoryById);

export default router;
