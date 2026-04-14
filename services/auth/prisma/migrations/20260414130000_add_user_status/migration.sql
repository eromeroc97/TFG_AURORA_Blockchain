-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'PENDING';
