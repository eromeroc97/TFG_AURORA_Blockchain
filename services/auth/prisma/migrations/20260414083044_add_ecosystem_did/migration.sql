/*
  Warnings:

  - A unique constraint covering the columns `[did]` on the table `Ecosystem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[certificateFingerprint]` on the table `Ecosystem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Ecosystem" ADD COLUMN     "certificateFingerprint" TEXT,
ADD COLUMN     "did" TEXT,
ADD COLUMN     "status" "EcosystemStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Ecosystem_did_key" ON "Ecosystem"("did");

-- CreateIndex
CREATE UNIQUE INDEX "Ecosystem_certificateFingerprint_key" ON "Ecosystem"("certificateFingerprint");
