import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  optionalUrl,
  nullableNumber,
} from "../validators/common.validators.js";
import * as controller from "../controllers/user.controller.js";

const router = Router();
const updateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).nullable().optional(),
  birthDate: z.iso.date().nullable().optional(),
  avatarUrl: optionalUrl,
  objective: z.string().trim().max(300).nullable().optional(),
  initialHeightCm: nullableNumber(260).optional(),
});
router.use(authenticate);
router.get("/me", asyncHandler(controller.me));
router.put("/me", validate(updateSchema), asyncHandler(controller.updateMe));
export default router;
