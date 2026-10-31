import { Router } from "express";
import {
  registerForEvent,
  unregisterFromEvent,
} from "../controllers/registrationController";
import { requireAuth } from "../middleware/authMiddleware";
import { registrationLimiter } from "../middleware/rateLimiters";

const router = Router({ mergeParams: true });

router.post("/", requireAuth, registrationLimiter, registerForEvent);
router.delete("/", requireAuth, registrationLimiter, unregisterFromEvent);

export default router;
