import { z } from "zod";
import { optionalUrl } from "./common.validators.js";

export const nutritionAnalysisSchema = z.object({
  imageUrl: z.url(),
  note: z.string().trim().max(500).optional(),
  consumedAt: z.iso.datetime().optional(),
  date: z.iso.date().optional(),
  timezoneOffset: z.number().int().min(-840).max(840).optional(),
});

export const trainingAdviceSchema = z.object({
  message: z.string().trim().max(1500).default(""),
  imageUrl: optionalUrl,
  videoUrl: optionalUrl,
}).superRefine((data, context) => {
  if (!data.message && !data.imageUrl && !data.videoUrl) {
    context.addIssue({ code: "custom", path: ["message"], message: "Escreva uma dúvida ou envie uma foto ou vídeo." });
  }
  if (data.imageUrl && data.videoUrl) {
    context.addIssue({ code: "custom", path: ["videoUrl"], message: "Envie uma foto ou um vídeo por vez." });
  }
});
