-- Workspace-level Google OAuth credentials (optional alternative to server env vars)
ALTER TABLE "Organization" ADD COLUMN "googleClientId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "googleClientSecret" TEXT;
