/*
  Warnings:

  - You are about to drop the column `certificateFingerprint` on the `Ecosystem` table. All the data in the column will be lost.
  - You are about to drop the column `did` on the `Ecosystem` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Ecosystem` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Ecosystem_certificateFingerprint_key";

-- DropIndex
DROP INDEX "Ecosystem_did_key";

-- AlterTable
ALTER TABLE "Ecosystem" DROP COLUMN "certificateFingerprint",
DROP COLUMN "did",
DROP COLUMN "status",
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeen" TIMESTAMP(3),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
