-- Centraliza aparência pública e preço do plano configurados pelo painel.
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL DEFAULT 'app',
    "appName" TEXT NOT NULL DEFAULT 'Essenza',
    "loginImageUrl" TEXT,
    "loginEyebrow" TEXT NOT NULL DEFAULT 'SUA JORNADA COMEÇA AQUI',
    "loginHeadline" TEXT NOT NULL DEFAULT 'Seu corpo pede equilíbrio.',
    "loginSubtitle" TEXT NOT NULL DEFAULT 'Treinos, cuidado e evolução lado a lado, no seu ritmo.',
    "homeBannerUrl" TEXT,
    "homeBannerLabel" TEXT NOT NULL DEFAULT 'CONTINUE SUA JORNADA',
    "paymentBannerUrl" TEXT,
    "planTitle" TEXT NOT NULL DEFAULT 'Plano Essenza — 12 meses',
    "planDescription" TEXT NOT NULL DEFAULT 'Acesso completo por 12 meses',
    "planDurationMonths" INTEGER NOT NULL DEFAULT 12,
    "pixPriceCents" INTEGER NOT NULL DEFAULT 1200,
    "cardBasePriceCents" INTEGER NOT NULL DEFAULT 1200,
    "cardInstallments" INTEGER NOT NULL DEFAULT 12,
    "cardInterestPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AppConfig" ("id", "updatedAt") VALUES ('app', CURRENT_TIMESTAMP);

ALTER TABLE "PaymentOrder" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "PaymentOrder" ADD COLUMN "durationMonths" INTEGER NOT NULL DEFAULT 12;
