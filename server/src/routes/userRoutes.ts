import { Router } from "express";
import { getMyProfile, getMyStats } from "../controllers/userController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.get("/me", requireAuth, getMyProfile);
router.get("/me/stats", requireAuth, getMyStats);

export default router;
