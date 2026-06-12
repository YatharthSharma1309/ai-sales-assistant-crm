-- Session families, absolute TTL, and refresh token reuse detection
ALTER TABLE "AuthSession" ADD COLUMN "familyId" TEXT;
ALTER TABLE "AuthSession" ADD COLUMN "absoluteExpiresAt" TIMESTAMP(3);

UPDATE "AuthSession" SET "familyId" = "id" WHERE "familyId" IS NULL;
UPDATE "AuthSession" SET "absoluteExpiresAt" = "createdAt" + INTERVAL '90 days' WHERE "absoluteExpiresAt" IS NULL;

CREATE INDEX "AuthSession_familyId_idx" ON "AuthSession"("familyId");
