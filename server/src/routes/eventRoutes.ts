import { Router } from "express";
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController";
import {
  inviteUserToEvent,
  getEventInvites,
} from "../controllers/eventInviteController";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware";
import registrationRoutes from "./registrationRoutes";
import { eventWriteLimiter, inviteLimiter } from "../middleware/rateLimiters";

const router = Router();

router.get("/", optionalAuth, getAllEvents);
router.get("/:id", optionalAuth, getEventById);
router.post("/", requireAuth, eventWriteLimiter, createEvent);
router.put("/:id", requireAuth, eventWriteLimiter, updateEvent);
router.delete("/:id", requireAuth, eventWriteLimiter, deleteEvent);
router.post("/:id/invites", requireAuth, inviteLimiter, inviteUserToEvent);
router.get("/:id/invites", requireAuth, getEventInvites);
router.use("/:id/register", registrationRoutes);

export default router;
