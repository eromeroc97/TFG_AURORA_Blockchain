-- CreateEnum
CREATE TYPE "EcosystemAccessStatus" AS ENUM ('PENDING', 'VALID', 'REVOKED');

-- AlterTable
ALTER TABLE "EcosystemAccess" ADD COLUMN "status" "EcosystemAccessStatus" NOT NULL DEFAULT 'PENDING';

-- Set existing records to VALID (they were all confirmed before this migration)
UPDATE "EcosystemAccess" SET "status" = 'VALID';