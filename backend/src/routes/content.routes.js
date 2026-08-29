import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize, requireActiveAccess } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { idParams } from "../validators/common.validators.js";
import * as controller from "../controllers/content.controller.js";

const router = Router();
const studentOnly = [authenticate, authorize("STUDENT"), requireActiveAccess];
router.get("/programs", ...studentOnly, asyncHandler(controller.listPrograms));
router.get("/home-content", ...studentOnly, asyncHandler(controller.listHomeContent));
router.get("/training-programs", ...studentOnly, asyncHandler(controller.listTrainingPrograms));
router.get("/meditations", ...studentOnly, asyncHandler(controller.listMeditations));
router.get(
  "/content-modules/:id",
  ...studentOnly,
  validate(idParams, "params"),
  asyncHandler(controller.getContentModule),
);
router.get(
  "/training-programs/:id",
  ...studentOnly,
  validate(idParams, "params"),
  asyncHandler(controller.getTrainingProgram),
);
router.get(
  "/programs/:id",
  ...studentOnly,
  validate(idParams, "params"),
  asyncHandler(controller.getProgram),
);
router.get(
  "/modules/:id",
  ...studentOnly,
  validate(idParams, "params"),
  asyncHandler(controller.getModule),
);
router.get(
  "/lessons/:id",
  ...studentOnly,
  validate(idParams, "params"),
  asyncHandler(controller.getLesson),
);
router.post(
  "/lessons/:id/complete",
  ...studentOnly,
  validate(idParams, "params"),
  validate(z.object({ completed: z.boolean().optional() })),
  asyncHandler(controller.completeLesson),
);
export default router;
