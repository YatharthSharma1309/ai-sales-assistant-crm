-- V2: pagination support fields, CRM sync, lead scoring, email logging

ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'HUBSPOT';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'SALESFORCE';

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "emailLogToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_emailLogToken_key" ON "Organization"("emailLogToken");

ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "externalSource" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Contact_organizationId_externalSource_externalId_key" ON "Contact"("organizationId", "externalSource", "externalId");

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "scoreUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "externalSource" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE INDEX IF NOT EXISTS "Lead_organizationId_score_idx" ON "Lead"("organizationId", "score");
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_organizationId_externalSource_externalId_key" ON "Lead"("organizationId", "externalSource", "externalId");

ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "externalSource" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Deal_organizationId_externalSource_externalId_key" ON "Deal"("organizationId", "externalSource", "externalId");

ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "externalMessageId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Activity_organizationId_externalMessageId_key" ON "Activity"("organizationId", "externalMessageId");

ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
