import { Router } from "express";
import { authenticate, authorize, requireActiveAccess } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as controller from "../controllers/measurement.controller.js";
import {
  measurementSchema,
  photoSchema,
} from "../validators/measurement.validators.js";

const router = Router();
const studentOnly = [authenticate, authorize("STUDENT"), requireActiveAccess];
router.get("/measurements", ...studentOnly, asyncHandler(controller.list));
router.post(
  "/measurements",
  ...studentOnly,
  validate(measurementSchema),
  asyncHandler(controller.create),
);
router.get(
  "/measurements/evolution",
  ...studentOnly,
  asyncHandler(controller.getEvolution),
);
router.get(
  "/progress-photos",
  ...studentOnly,
  asyncHandler(controller.listPhotos),
);
router.post(
  "/progress-photos",
  ...studentOnly,
  validate(photoSchema),
  asyncHandler(controller.createPhoto),
);
export default router;
