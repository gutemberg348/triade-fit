import { z } from "zod";
import { nullableNumber, optionalUrl } from "./common.validators.js";

export const measurementSchema = z.object({
  measuredAt: z.iso.date(),
  weightKg: nullableNumber(500),
  heightCm: nullableNumber(260),
  bodyFatPercent: nullableNumber(100),
  waistCm: nullableNumber(),
  abdomenCm: nullableNumber(),
  hipsCm: nullableNumber(),
  chestCm: nullableNumber(),
  rightArmCm: nullableNumber(),
  leftArmCm: nullableNumber(),
  rightThighCm: nullableNumber(),
  leftThighCm: nullableNumber(),
  rightCalfCm: nullableNumber(),
  leftCalfCm: nullableNumber(),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export const photoSchema = z.object({
  photoUrl: optionalUrl.refine(Boolean, "Informe a URL da foto."),
  pose: z.enum(["FRONT", "SIDE", "BACK"]),
  takenAt: z.iso.date(),
  notes: z.string().trim().max(500).nullable().optional(),
});
