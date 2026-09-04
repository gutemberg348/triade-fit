import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { idParams, paginationQuery } from "../validators/common.validators.js";
import { measurementSchema } from "../validators/measurement.validators.js";
import { communityCommentSchema } from "../validators/community.validators.js";
import {
  announcementSchema,
  communityPostSchema,
  lessonSchema,
  moduleSchema,
  partnerCreditSchema,
  partnerSchema,
  programSchema,
  studentCreateSchema,
  studentPasswordSchema,
  studentUpdateSchema,
} from "../validators/admin.validators.js";
import * as controller from "../controllers/admin.controller.js";

const router = Router();
router.use(authenticate, authorize("ADMIN"));
router.get("/dashboard", asyncHandler(controller.dashboard));
router.get(
  "/students",
  validate(paginationQuery, "query"),
  asyncHandler(controller.listStudents),
);
router.post(
  "/students",
  validate(studentCreateSchema),
  asyncHandler(controller.createStudent),
);
router.get("/partners", asyncHandler(controller.listPartners));
router.put(
  "/students/:id/partner",
  validate(idParams, "params"),
  validate(partnerSchema),
  asyncHandler(controller.upsertStudentPartner),
);
router.post(
  "/partners/:id/credits",
  validate(idParams, "params"),
  validate(partnerCreditSchema),
  asyncHandler(controller.addPartnerCredit),
);
router.get(
  "/students/:id",
  validate(idParams, "params"),
  asyncHandler(controller.getStudent),
);
router.put(
  "/students/:id",
  validate(idParams, "params"),
  validate(studentUpdateSchema),
  asyncHandler(controller.updateStudent),
);
router.put(
  "/students/:id/password",
  validate(idParams, "params"),
  validate(studentPasswordSchema),
  asyncHandler(controller.changeStudentPassword),
);
router.delete(
  "/students/:id",
  validate(idParams, "params"),
  asyncHandler(controller.deleteStudent),
);
router.post(
  "/students/:id/measurements",
  validate(idParams, "params"),
  validate(measurementSchema),
  asyncHandler(controller.addStudentMeasurement),
);
router.get("/programs", asyncHandler(controller.listPrograms));
router.post(
  "/programs",
  validate(programSchema),
  asyncHandler(controller.createProgram),
);
router.put(
  "/programs/:id",
  validate(idParams, "params"),
  validate(programSchema),
  asyncHandler(controller.updateProgram),
);
router.delete(
  "/programs/:id",
  validate(idParams, "params"),
  asyncHandler(controller.archiveProgram),
);
router.post(
  "/modules",
  validate(moduleSchema),
  asyncHandler(controller.createModule),
);
router.put(
  "/modules/:id",
  validate(idParams, "params"),
  validate(moduleSchema),
  asyncHandler(controller.updateModule),
);
router.delete(
  "/modules/:id",
  validate(idParams, "params"),
  asyncHandler(controller.archiveModule),
);
router.post(
  "/lessons",
  validate(lessonSchema),
  asyncHandler(controller.createLesson),
);
router.put(
  "/lessons/:id",
  validate(idParams, "params"),
  validate(lessonSchema),
  asyncHandler(controller.updateLesson),
);
router.delete(
  "/lessons/:id",
  validate(idParams, "params"),
  asyncHandler(controller.archiveLesson),
);
router.get("/announcements", asyncHandler(controller.listAnnouncements));
router.post(
  "/announcements",
  validate(announcementSchema),
  asyncHandler(controller.createAnnouncement),
);
router.put(
  "/announcements/:id",
  validate(idParams, "params"),
  validate(announcementSchema),
  asyncHandler(controller.updateAnnouncement),
);
router.get("/community-posts", asyncHandler(controller.listCommunityPosts));
router.get(
  "/community-posts/:id/comments",
  validate(idParams, "params"),
  asyncHandler(controller.listCommunityPostComments),
);
router.get(
  "/community-posts/:id/likes",
  validate(idParams, "params"),
  asyncHandler(controller.listCommunityPostLikes),
);
router.post(
  "/community-posts/:id/comments",
  validate(idParams, "params"),
  validate(communityCommentSchema),
  asyncHandler(controller.createCommunityPostComment),
);
router.post(
  "/community-posts",
  validate(communityPostSchema),
  asyncHandler(controller.createCommunityPost),
);
router.put(
  "/community-posts/:id",
  validate(idParams, "params"),
  validate(communityPostSchema),
  asyncHandler(controller.updateCommunityPost),
);
export default router;
