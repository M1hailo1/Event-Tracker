import { Router } from "express";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from "../controllers/followController";
import { requireAuth } from "../middleware/authMiddleware";
import { followLimiter } from "../middleware/rateLimiters";

const router = Router();

router.post("/:userId/follow", requireAuth, followLimiter, followUser);
router.delete("/:userId/follow", requireAuth, followLimiter, unfollowUser);
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);

export default router;
