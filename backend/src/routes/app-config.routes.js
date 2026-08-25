import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { appConfigSchema } from "../validators/admin.validators.js";
import * as controller from "../controllers/app-config.controller.js";

const router = Router();

router.get("/app-config", asyncHandler(controller.publicConfig));
router.get(
  "/admin/app-config",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(controller.adminConfig),
);
router.put(
  "/admin/app-config",
  authenticate,
  authorize("ADMIN"),
  validate(appConfigSchema),
  asyncHandler(controller.updateConfig),
);

export default router;
