CREATE TYPE "AccessStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'OVERDUE', 'BLOCKED', 'CANCELLED');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'APPROVED', 'CANCELLED');
CREATE TYPE "PartnerLedgerType" AS ENUM ('CREDIT', 'DEBIT', 'ADJUSTMENT');

ALTER TABLE "StudentProfile"
  ADD COLUMN "accessStatus" "AccessStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  ADD COLUMN "accessExpiresAt" TIMESTAMP(3),
  ADD COLUMN "gatewayCustomerId" TEXT;

-- Alunas já existentes não perdem o acesso durante a atualização.
UPDATE "StudentProfile" AS profile
SET "accessStatus" = 'ACTIVE'
FROM "User" AS account
WHERE account.id = profile."userId" AND account.status = 'ACTIVE';

CREATE UNIQUE INDEX "StudentProfile_gatewayCustomerId_key" ON "StudentProfile"("gatewayCustomerId");

CREATE TABLE "PartnerProfile" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "referralCode" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "defaultCreditCents" INTEGER NOT NULL DEFAULT 0,
  "balanceCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Referral" (
  "id" UUID NOT NULL,
  "partnerId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "creditCents" INTEGER NOT NULL DEFAULT 0,
  "paymentReference" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerLedgerEntry" (
  "id" UUID NOT NULL,
  "partnerId" UUID NOT NULL,
  "referralId" UUID,
  "type" "PartnerLedgerType" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerProfile_studentId_key" ON "PartnerProfile"("studentId");
CREATE UNIQUE INDEX "PartnerProfile_referralCode_key" ON "PartnerProfile"("referralCode");
CREATE INDEX "PartnerProfile_active_idx" ON "PartnerProfile"("active");
CREATE UNIQUE INDEX "Referral_studentId_key" ON "Referral"("studentId");
CREATE UNIQUE INDEX "Referral_paymentReference_key" ON "Referral"("paymentReference");
CREATE INDEX "Referral_partnerId_status_idx" ON "Referral"("partnerId", "status");
CREATE UNIQUE INDEX "PartnerLedgerEntry_referralId_key" ON "PartnerLedgerEntry"("referralId");
CREATE INDEX "PartnerLedgerEntry_partnerId_createdAt_idx" ON "PartnerLedgerEntry"("partnerId", "createdAt" DESC);

ALTER TABLE "PartnerProfile" ADD CONSTRAINT "PartnerProfile_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerLedgerEntry" ADD CONSTRAINT "PartnerLedgerEntry_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerLedgerEntry" ADD CONSTRAINT "PartnerLedgerEntry_referralId_fkey"
  FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
