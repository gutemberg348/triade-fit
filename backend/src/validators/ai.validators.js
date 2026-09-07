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
  dailyRoutine: z.enum(["VERY_SEDENTARY", "LIGHTLY_ACTIVE", "MODERATELY_ACTIVE", "VERY_ACTIVE", "HEAVY_WORK"], {
    error: "Escolha como é sua rotina diária.",
  }),
  exerciseFrequency: z.enum(["NONE", "ONE_TWO", "THREE_FOUR", "FIVE_SIX", "DAILY"], {
    error: "Informe com que frequência você se exercita.",
  }),
  exerciseDuration: z.enum(["UP_TO_30", "THIRTY_SIXTY", "SIXTY_NINETY", "OVER_NINETY"]).nullable().optional(),
  exerciseIntensity: z.enum(["LIGHT", "MODERATE", "INTENSE"]).nullable().optional(),
}).superRefine((data, context) => {
  if (data.exerciseFrequency === "NONE") return;
  if (!data.exerciseDuration) context.addIssue({ code: "custom", path: ["exerciseDuration"], message: "Informe a duração média do treino." });
  if (!data.exerciseIntensity) context.addIssue({ code: "custom", path: ["exerciseIntensity"], message: "Escolha a intensidade do treino." });
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
