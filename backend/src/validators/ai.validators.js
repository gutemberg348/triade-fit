import { z } from "zod";
import { optionalUrl } from "./common.validators.js";

export const nutritionAnalysisSchema = z.object({
  imageUrl: z.url(),
  note: z.string().trim().max(500).optional(),
  consumedAt: z.iso.datetime().optional(),
  date: z.iso.date().optional(),
  timezoneOffset: z.number().int().min(-840).max(840).optional(),
});

export const nutritionProfileSchema = z.object({
  biologicalSex: z.enum(["FEMALE", "MALE"], {
    error: "Escolha o sexo usado pela fórmula.",
  }),
  ageYears: z.number().int().min(18, "A idade mínima para este cálculo é 18 anos.").max(100, "Informe uma idade válida."),
  weightKg: z.number().min(30, "Informe um peso válido.").max(350, "Informe um peso válido."),
  heightCm: z.number().min(120, "Informe a altura em centímetros.").max(230, "Informe uma altura válida."),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE"], {
    error: "Escolha seu nível de atividade.",
  }),
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
