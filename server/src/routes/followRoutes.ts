import { Router } from "express";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from "../controllers/followController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.post("/:userId/follow", requireAuth, followUser);
router.delete("/:userId/follow", requireAuth, unfollowUser);
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);

export default router;
