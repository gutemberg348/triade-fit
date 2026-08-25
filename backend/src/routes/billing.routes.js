import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middlewares/validate.js";
import { z } from "zod";
import * as controller from "../controllers/billing.controller.js";
import {
  cardPaymentSchema,
  pixPaymentSchema,
} from "../validators/billing.validators.js";

const router = Router();

router.get("/checkout-return", controller.checkoutReturn);
router.post("/asaas/webhook", asyncHandler(controller.asaasWebhook));

router.use(authenticate, authorize("STUDENT"));
router.get("/me", asyncHandler(controller.myStatus));
router.post(
  "/initial-plan/pix",
  validate(pixPaymentSchema),
  asyncHandler(controller.createPix),
);
router.post(
  "/initial-plan/card",
  validate(cardPaymentSchema),
  asyncHandler(controller.payCard),
);
router.post(
  "/initial-plan/sync",
  asyncHandler(controller.syncLatestPayment),
);
router.post(
  "/initial-plan/checkout",
  validate(z.object({ paymentMethod: z.enum(["PIX", "CREDIT_CARD"]) })),
  asyncHandler(controller.createCheckout),
);

export default router;
