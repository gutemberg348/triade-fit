CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'CANCELLED', 'REFUNDED');

CREATE TABLE "PaymentOrder" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'ASAAS',
  "planCode" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "externalReference" TEXT NOT NULL,
  "providerCheckoutId" TEXT,
  "providerPaymentId" TEXT,
  "checkoutUrl" TEXT,
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentWebhookEvent" (
  "id" UUID NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "paymentOrderId" UUID,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentOrder_externalReference_key" ON "PaymentOrder"("externalReference");
CREATE UNIQUE INDEX "PaymentOrder_providerCheckoutId_key" ON "PaymentOrder"("providerCheckoutId");
CREATE UNIQUE INDEX "PaymentOrder_providerPaymentId_key" ON "PaymentOrder"("providerPaymentId");
CREATE INDEX "PaymentOrder_studentId_status_createdAt_idx" ON "PaymentOrder"("studentId", "status", "createdAt" DESC);
CREATE UNIQUE INDEX "PaymentWebhookEvent_providerEventId_key" ON "PaymentWebhookEvent"("providerEventId");
CREATE INDEX "PaymentWebhookEvent_paymentOrderId_receivedAt_idx" ON "PaymentWebhookEvent"("paymentOrderId", "receivedAt" DESC);

ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentOrderId_fkey"
  FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
