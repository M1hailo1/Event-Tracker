import { Router } from "express";
import {
  getAllCategories,
  createCategory,
} from "../controllers/categoryController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.get("/", getAllCategories);
router.post("/", requireAuth, createCategory);

export default router;
