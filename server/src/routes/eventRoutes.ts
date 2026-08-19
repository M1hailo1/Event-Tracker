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

const router = Router();

router.get("/", optionalAuth, getAllEvents);
router.get("/:id", optionalAuth, getEventById);
router.post("/", requireAuth, createEvent);
router.put("/:id", requireAuth, updateEvent);
router.delete("/:id", requireAuth, deleteEvent);
router.post("/:id/invites", requireAuth, inviteUserToEvent);
router.get("/:id/invites", requireAuth, getEventInvites);
router.use("/:id/register", registrationRoutes);

export default router;
