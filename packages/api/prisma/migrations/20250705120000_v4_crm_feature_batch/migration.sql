-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "leadCaptureToken" TEXT;
ALTER TABLE "Organization" ADD COLUMN "staleDealAlertsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "staleDealAlertDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "Organization" ADD COLUMN "lastStaleDealAlertAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN "riskLevel" TEXT;
ALTER TABLE "Deal" ADD COLUMN "riskNote" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_leadCaptureToken_key" ON "Organization"("leadCaptureToken");
