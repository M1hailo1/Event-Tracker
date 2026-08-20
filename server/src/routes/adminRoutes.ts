import { Router } from "express";
import {
  getAdminStats,
  getAllUsersAdmin,
  deleteUserAdmin,
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

router.get("/events", getAllEventsAdmin);
router.put("/events/:id", updateEventAdmin);
router.delete("/events/:id", deleteEventAdmin);

export default router;
