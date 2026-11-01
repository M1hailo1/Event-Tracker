import { getCommentReports, reviewCommentReport } from "../controllers/commentReportController";
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

const router = Router();

router.use(requireAuth, requireStaff);

router.patch("/users/:id/role", requireAdmin, setModeratorRole);

router.get("/stats", getAdminStats);
router.get("/comment-reports", getCommentReports);
router.patch("/comment-reports/:reportId", reviewCommentReport);

router.get("/users", getAllUsersAdmin);
router.delete("/users/:id", deleteUserAdmin);
router.patch("/users/:id/ban", banUserAdmin);
router.patch("/users/:id/unban", unbanUserAdmin);

router.get("/events", getAllEventsAdmin);
router.put("/events/:id", updateEventAdmin);
router.delete("/events/:id", deleteEventAdmin);

export default router;
