import { Router } from "express";
import {
  getMyProfile,
  getMyStats,
  getUserById,
} from "../controllers/userController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.get("/me", requireAuth, getMyProfile);
router.get("/me/stats", requireAuth, getMyStats);
router.get("/:id", getUserById);

export default router;
