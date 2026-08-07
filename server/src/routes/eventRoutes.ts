import { Router } from "express";
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController";
import { requireAuth } from "../middleware/authMiddleware";
import registrationRoutes from "./registrationRoutes";

const router = Router();

router.get("/", getAllEvents);
router.get("/:id", getEventById);
router.post("/", requireAuth, createEvent);
router.put("/:id", requireAuth, updateEvent);
router.delete("/:id", requireAuth, deleteEvent);
router.use("/:id/register", registrationRoutes);

export default router;
