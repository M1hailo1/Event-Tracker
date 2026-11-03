import { Router } from "express";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from "../controllers/followController";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware";
import { followLimiter } from "../middleware/rateLimiters";

const router = Router();

router.post("/:userId/follow", requireAuth, followLimiter, followUser);
router.delete("/:userId/follow", requireAuth, followLimiter, unfollowUser);
router.get("/:userId/followers", optionalAuth, getFollowers);
router.get("/:userId/following", optionalAuth, getFollowing);

export default router;
