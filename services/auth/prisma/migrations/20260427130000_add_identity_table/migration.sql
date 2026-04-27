-- Add missing Identity model and relation fields

-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('USER', 'ECOSYSTEM');

-- DropIndex
DROP INDEX IF EXISTS "Ecosystem_certificateFingerprint_key";

-- DropIndex
DROP INDEX IF EXISTS "Ecosystem_did_key";

-- DropIndex
DROP INDEX IF EXISTS "User_did_key";

-- AlterTable
ALTER TABLE "Ecosystem" DROP COLUMN IF EXISTS "certificateFingerprint",
DROP COLUMN IF EXISTS "did",
ADD COLUMN     "identityId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "did",
DROP COLUMN IF EXISTS "encryptedPrivateKey",
DROP COLUMN IF EXISTS "keyRotationTimestamp",
DROP COLUMN IF EXISTS "publicKey",
ADD COLUMN     "identityId" UUID;

-- CreateTable
CREATE TABLE "Identity" (
    "id" UUID NOT NULL,
    "type" "IdentityType" NOT NULL,
    "publicKey" TEXT NOT NULL,
    "private_key_ciphertext" TEXT NOT NULL,
    "private_key_iv" TEXT NOT NULL,
    "private_key_auth_tag" TEXT NOT NULL,
    "keyRotationTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ecosystem_identityId_key" ON "Ecosystem"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "User_identityId_key" ON "User"("identityId");

-- CreateIndex
CREATE INDEX "User_identityId_idx" ON "User"("identityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ecosystem" ADD CONSTRAINT "Ecosystem_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
