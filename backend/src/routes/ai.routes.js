import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate, authorize, requireActiveAccess } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { idParams } from "../validators/common.validators.js";
import { nutritionAnalysisSchema, trainingAdviceSchema } from "../validators/ai.validators.js";
import * as controller from "../controllers/ai.controller.js";

const router = Router();
const studentOnly = [authenticate, authorize("STUDENT"), requireActiveAccess];
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Você atingiu o limite temporário da Luna. Tente novamente mais tarde." },
});

router.get("/nutrition/today", ...studentOnly, asyncHandler(controller.todayNutrition));
router.post("/ai/nutrition/analyze", ...studentOnly, aiLimiter, validate(nutritionAnalysisSchema), asyncHandler(controller.analyzeNutrition));
router.delete("/nutrition/entries/:id", ...studentOnly, validate(idParams, "params"), asyncHandler(controller.deleteNutritionEntry));
router.get("/ai/training/history", ...studentOnly, asyncHandler(controller.trainingHistory));
router.post("/ai/training/advice", ...studentOnly, aiLimiter, validate(trainingAdviceSchema), asyncHandler(controller.trainingAdvice));

export default router;
