-- Extend user status lifecycle with password-expired blocking state.
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PASSBLOCK';

-- Track the last password rotation timestamp for every user.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Normalize existing values; trigger/policy setup is applied in a following migration
-- to ensure PASSBLOCK enum value is committed before first use.
UPDATE "User"
SET "passwordChangedAt" = date_trunc('day', "passwordChangedAt");
