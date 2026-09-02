import { Router } from "express";
import { authenticate, authorize, requireActiveAccess } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { idParams } from "../validators/common.validators.js";
import { communityCommentSchema } from "../validators/community.validators.js";
import * as controller from "../controllers/announcement.controller.js";

const router = Router();
const studentOnly = [authenticate, authorize("STUDENT"), requireActiveAccess];
router.get("/announcements", ...studentOnly, asyncHandler(controller.list));
router.get(
  "/community/posts",
  ...studentOnly,
  asyncHandler(controller.communityPosts),
);
router.post(
  "/community/posts/:id/like",
  ...studentOnly,
  validate(idParams, "params"),
  asyncHandler(controller.likeCommunityPost),
);
router.delete(
  "/community/posts/:id/like",
  ...studentOnly,
  validate(idParams, "params"),
  asyncHandler(controller.unlikeCommunityPost),
);
router.get(
  "/community/posts/:id/likes",
  ...studentOnly,
  validate(idParams, "params"),
  asyncHandler(controller.communityPostLikes),
);
router.get(
  "/community/posts/:id/comments",
  ...studentOnly,
  validate(idParams, "params"),
  asyncHandler(controller.communityPostComments),
);
router.post(
  "/community/posts/:id/comments",
  ...studentOnly,
  validate(idParams, "params"),
  validate(communityCommentSchema),
  asyncHandler(controller.createCommunityPostComment),
);
router.get(
  "/notifications",
  ...studentOnly,
  asyncHandler(controller.notifications),
);
router.patch(
  "/notifications/:id/read",
  ...studentOnly,
  validate(idParams, "params"),
  asyncHandler(controller.readNotification),
);
export default router;
