import { getEventSharePreview } from "../controllers/eventShareController";
import { getSavedEventIds, saveEvent, unsaveEvent } from "../controllers/savedEventController";
import { saveEventLimiter } from "../middleware/rateLimiters";
import { reportComment } from "../controllers/commentReportController";
import { cancelEvent } from "../controllers/eventCancellationController";
import { requireCommentAccess, getComments, createComment, updateComment, deleteComment } from "../controllers/commentController";
import { Router } from "express";
import {
  createEvent,
  getAllEvents,
  getEventById,
  getEventAttendees,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController";
import {
  inviteUserToEvent,
  getEventInvites,
} from "../controllers/eventInviteController";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware";
import registrationRoutes from "./registrationRoutes";
import { eventWriteLimiter, inviteLimiter, commentWriteLimiter, commentPostLimiter, commentReportLimiter } from "../middleware/rateLimiters";

import { rateEvent } from "../controllers/ratingController";

const router = Router();
router.get("/saved-ids", requireAuth, getSavedEventIds);
router.put("/:id/save", requireAuth, saveEventLimiter, saveEvent);
router.delete("/:id/save", requireAuth, saveEventLimiter, unsaveEvent);
router.post("/:id/comments/:commentId/reports", requireAuth, commentReportLimiter, requireCommentAccess, reportComment);
router.get("/:id/comments", optionalAuth, requireCommentAccess, getComments);
router.post("/:id/comments", requireAuth, commentPostLimiter, commentWriteLimiter, requireCommentAccess, createComment);
router.put("/:id/comments/:commentId", requireAuth, commentWriteLimiter, requireCommentAccess, updateComment);
router.delete("/:id/comments/:commentId", requireAuth, commentWriteLimiter, requireCommentAccess, deleteComment);
router.put("/:id/rating", requireAuth, eventWriteLimiter, rateEvent);

router.get("/", optionalAuth, getAllEvents);
router.get("/:id/share", getEventSharePreview);
router.get("/:id/attendees", optionalAuth, getEventAttendees);
router.get("/:id", optionalAuth, getEventById);
router.post("/", requireAuth, eventWriteLimiter, createEvent);
router.put("/:id", requireAuth, eventWriteLimiter, updateEvent);
router.delete("/:id", requireAuth, eventWriteLimiter, deleteEvent);
router.post("/:id/cancel", requireAuth, eventWriteLimiter, cancelEvent);
router.post("/:id/invites", requireAuth, inviteLimiter, inviteUserToEvent);
router.get("/:id/invites", requireAuth, getEventInvites);
router.use("/:id/register", registrationRoutes);

export default router;
