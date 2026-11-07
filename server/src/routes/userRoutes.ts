import { Router } from "express";
import { getMyInterests, updateMyInterests } from "../controllers/interestController";
import {
  getMyProfile,
  getMyStats,
  getUserById,
} from "../controllers/userController";
import { getMyDashboard } from "../controllers/dashboardController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.get("/me", requireAuth, getMyProfile);
router.get("/me/interests", requireAuth, getMyInterests);
router.put("/me/interests", requireAuth, updateMyInterests);
router.get("/me/stats", requireAuth, getMyStats);
router.get("/me/dashboard", requireAuth, getMyDashboard);
router.get("/:id", getUserById);

export default router;
