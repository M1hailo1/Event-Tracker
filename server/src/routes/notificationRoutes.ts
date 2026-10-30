import { Router } from "express";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markEventAsRead,
} from "../controllers/notificationController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.get("/", requireAuth, getMyNotifications);
router.get("/unread-count", requireAuth, getUnreadCount);
router.patch("/:id/read", requireAuth, markAsRead);
router.patch("/read-all", requireAuth, markAllAsRead);
router.patch("/events/:eventId/read", requireAuth, markEventAsRead);

export default router;
