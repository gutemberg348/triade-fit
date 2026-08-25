import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as controller from "../controllers/auth.controller.js";
import {
  changePasswordSchema,
  forgotSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetSchema,
} from "../validators/auth.validators.js";

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde alguns minutos." },
});
router.post(
  "/register",
  limiter,
  validate(registerSchema),
  asyncHandler(controller.register),
);
router.post(
  "/login",
  limiter,
  validate(loginSchema),
  asyncHandler(controller.login),
);
router.post(
  "/admin/login",
  limiter,
  validate(loginSchema),
  asyncHandler(controller.adminLogin),
);
router.post(
  "/refresh",
  limiter,
  validate(refreshSchema),
  asyncHandler(controller.refresh),
);
router.post(
  "/logout",
  validate(refreshSchema),
  asyncHandler(controller.logout),
);
router.post(
  "/forgot-password",
  limiter,
  validate(forgotSchema),
  asyncHandler(controller.forgot),
);
router.post(
  "/reset-password",
  limiter,
  validate(resetSchema),
  asyncHandler(controller.reset),
);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(controller.changePassword),
);
export default router;
