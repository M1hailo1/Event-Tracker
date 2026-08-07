import { Router } from "express";
import {
  registerForEvent,
  unregisterFromEvent,
} from "../controllers/registrationController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router({ mergeParams: true });

router.post("/", requireAuth, registerForEvent);
router.delete("/", requireAuth, unregisterFromEvent);

export default router;
