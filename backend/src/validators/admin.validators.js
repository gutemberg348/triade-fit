import { z } from "zod";
import { nullableNumber, optionalUrl } from "./common.validators.js";

const password = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Za-z]/)
  .regex(/[0-9]/);
const accessStatus = z.enum([
  "PENDING_PAYMENT",
  "ACTIVE",
  "OVERDUE",
  "BLOCKED",
  "CANCELLED",
]);
export const studentCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  password,
  phone: z.string().trim().max(30).optional(),
  birthDate: z.iso.date().optional(),
  avatarUrl: optionalUrl,
  objective: z.string().trim().max(300).optional(),
  initialHeightCm: nullableNumber(260).optional(),
  programIds: z.array(z.uuid()).default([]),
  partnerId: z.uuid().nullable().optional(),
});
export const studentUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.email().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  birthDate: z.iso.date().nullable().optional(),
  avatarUrl: optionalUrl,
  objective: z.string().trim().max(300).nullable().optional(),
  notes: z.string().trim().max(3000).nullable().optional(),
  initialHeightCm: nullableNumber(260).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  programIds: z.array(z.uuid()).optional(),
  accessStatus: accessStatus.optional(),
  accessExpiresAt: z.iso.date().nullable().optional(),
  gatewayCustomerId: z.string().trim().max(180).nullable().optional(),
  partnerId: z.uuid().nullable().optional(),
});

export const studentPasswordSchema = z
  .object({
    password,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não são iguais.",
    path: ["passwordConfirmation"],
  });

export const partnerSchema = z.object({
  active: z.boolean().default(true),
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(4)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/)
    .optional(),
  defaultCreditCents: z.coerce.number().int().min(0).max(100000000).default(0),
});

export const partnerCreditSchema = z.object({
  amountCents: z.coerce.number().int().positive().max(100000000),
  description: z.string().trim().min(3).max(300),
});
export const programSchema = z.object({
  type: z.enum(["CONTENT", "TRAINING"]).optional(),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(2).max(5000),
  coverUrl: optionalUrl,
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
});
export const moduleSchema = z.object({
  programId: z.uuid().optional(),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(5000).nullable().optional(),
  coverUrl: optionalUrl,
  unlockDelayDays: z.coerce.number().int().min(0).max(3650).default(0),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
});
const lessonMaterialUrl = z.url().refine(
  (value) => ["http:", "https:"].includes(new URL(value).protocol),
  { message: "Use um link HTTP ou HTTPS." },
);

export const lessonSchema = z.object({
  moduleId: z.uuid().optional(),
  programId: z.uuid().optional(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  coverUrl: optionalUrl,
  videoUrl: optionalUrl,
  instructions: z.string().trim().max(10000).nullable().optional(),
  durationMinutes: z.coerce
    .number()
    .int()
    .positive()
    .max(600)
    .nullable()
    .optional(),
  category: z.string().trim().max(100).nullable().optional(),
  kind: z.enum(["CONTENT", "WORKOUT", "MEDITATION"]).default("CONTENT"),
  isIntroductory: z.boolean().default(false),
  showMeditationButton: z.boolean().default(false),
  unlockDelayHours: z.coerce.number().int().min(0).max(8760).default(0),
  difficulty: z.string().trim().max(60).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  materials: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(180),
        url: lessonMaterialUrl,
        type: z.enum(["FILE", "LINK"]).default("LINK"),
      }),
    )
    .max(30)
    .nullable()
    .optional(),
  notes: z.string().trim().max(3000).nullable().optional(),
}).superRefine((data, context) => {
  if (!data.moduleId && !data.programId) {
    context.addIssue({
      code: "custom",
      path: ["moduleId"],
      message: "Escolha o módulo ou o programa de treino desta aula.",
    });
  }
  if (
    data.kind === "MEDITATION" &&
    !data.showMeditationButton &&
    !data.videoUrl
  ) {
    context.addIssue({
      code: "custom",
      path: ["videoUrl"],
      message: "Informe ou envie um vídeo para uma aula somente em vídeo.",
    });
  }
});
export const announcementSchema = z
  .object({
    title: z.string().trim().min(2).max(180),
    message: z.string().trim().min(2).max(5000),
    imageUrl: optionalUrl,
    audience: z
      .enum(["ALL", "ACTIVE_STUDENTS", "SPECIFIC_STUDENTS"])
      .default("ALL"),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    studentIds: z.array(z.uuid()).default([]),
  })
  .refine(
    (data) =>
      data.audience !== "SPECIFIC_STUDENTS" || data.studentIds.length > 0,
    { message: "Escolha pelo menos um aluno.", path: ["studentIds"] },
  );

export const communityPostSchema = z.object({
  authorName: z.string().trim().min(2).max(100),
  authorAvatarUrl: optionalUrl,
  message: z.string().trim().min(2).max(5000),
  imageUrl: optionalUrl,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});

const appConfigUrl = z
  .union([
    z.url(),
    z.string().regex(/^\/[^\s]*$/, "Use uma URL ou um caminho público iniciado por /."),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value) => value || null);

export const appConfigSchema = z.object({
  appName: z.string().trim().min(2).max(60),
  themePreset: z.enum(["CHAMPAGNE_NUDE", "TRIADE_DARK"]),
  themeColors: z.object({
    background: z.string().regex(/^#[0-9A-F]{6}$/i),
    cardBackground: z.string().regex(/^#[0-9A-F]{6}$/i),
    secondaryBackground: z.string().regex(/^#[0-9A-F]{6}$/i),
    button: z.string().regex(/^#[0-9A-F]{6}$/i),
    buttonPressed: z.string().regex(/^#[0-9A-F]{6}$/i),
    title: z.string().regex(/^#[0-9A-F]{6}$/i),
    text: z.string().regex(/^#[0-9A-F]{6}$/i),
    secondaryText: z.string().regex(/^#[0-9A-F]{6}$/i),
    border: z.string().regex(/^#[0-9A-F]{6}$/i),
    activeIcon: z.string().regex(/^#[0-9A-F]{6}$/i),
    inactiveIcon: z.string().regex(/^#[0-9A-F]{6}$/i),
  }),
  loginImageUrl: appConfigUrl,
  loginEyebrow: z.string().trim().min(2).max(80),
  loginHeadline: z.string().trim().min(2).max(140),
  loginSubtitle: z.string().trim().min(2).max(240),
  homeBannerUrl: appConfigUrl,
  homeBannerLabel: z.string().trim().min(2).max(80),
  paymentBannerUrl: appConfigUrl,
  planTitle: z.string().trim().min(2).max(120),
  planDescription: z.string().trim().min(2).max(240),
  planDurationMonths: z.coerce.number().int().min(1).max(60),
  pixPriceCents: z.coerce.number().int().min(100).max(100000000),
  cardBasePriceCents: z.coerce.number().int().min(100).max(100000000),
  cardInstallments: z.coerce.number().int().min(1).max(21),
  cardInterestPercent: z.coerce.number().min(0).max(999.99),
});

export const trainingAiConfigSchema = z.object({
  prompt: z.string().trim().min(80).max(12000),
  knowledge: z.string().trim().min(80).max(100000),
});
