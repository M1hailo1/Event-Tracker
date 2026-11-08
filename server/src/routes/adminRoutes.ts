import { getCommentReports, reviewCommentReport } from "../controllers/commentReportController";
import { getAuditHistory } from "../controllers/auditController";
import { cancelEventAdmin } from "../controllers/eventCancellationController";
import { Router } from "express";
import {
  getAdminStats,
  setModeratorRole,
  getAllUsersAdmin,
  deleteUserAdmin,
  banUserAdmin,
  unbanUserAdmin,
  getAllEventsAdmin,
  updateEventAdmin,
  deleteEventAdmin,
} from "../controllers/adminController";
import { requireAuth, requireAdmin, requireStaff } from "../middleware/authMiddleware";
import { eventWriteLimiter, moderationLimiter } from "../middleware/rateLimiters";

const router = Router();

router.use(requireAuth, requireStaff);
router.get("/audit-history", requireAdmin, getAuditHistory);

router.patch("/users/:id/role", requireAdmin, moderationLimiter, setModeratorRole);

router.get("/stats", getAdminStats);
router.get("/comment-reports", getCommentReports);
router.patch("/comment-reports/:reportId", moderationLimiter, reviewCommentReport);

router.get("/users", getAllUsersAdmin);
router.delete("/users/:id", moderationLimiter, deleteUserAdmin);
router.patch("/users/:id/ban", moderationLimiter, banUserAdmin);
router.patch("/users/:id/unban", moderationLimiter, unbanUserAdmin);

router.get("/events", getAllEventsAdmin);
router.put("/events/:id", eventWriteLimiter, updateEventAdmin);
router.delete("/events/:id", eventWriteLimiter, deleteEventAdmin);
router.post("/events/:id/cancel", eventWriteLimiter, cancelEventAdmin);

export default router;
