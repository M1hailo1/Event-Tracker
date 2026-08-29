import { Router } from "express";
import {
  getAdminStats,
  getAllUsersAdmin,
  deleteUserAdmin,
  banUserAdmin,
  unbanUserAdmin,
  getAllEventsAdmin,
  updateEventAdmin,
  deleteEventAdmin,
} from "../controllers/adminController";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", getAdminStats);

router.get("/users", getAllUsersAdmin);
router.delete("/users/:id", deleteUserAdmin);
router.patch("/users/:id/ban", banUserAdmin);
router.patch("/users/:id/unban", unbanUserAdmin);

router.get("/events", getAllEventsAdmin);
router.put("/events/:id", updateEventAdmin);
router.delete("/events/:id", deleteEventAdmin);

export default router;
