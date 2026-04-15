/*
  Warnings:

  - You are about to drop the column `localType` on the `Device` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fingerprint]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[did]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fingerprint` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "localType",
ADD COLUMN     "did" TEXT,
ADD COLUMN     "fingerprint" TEXT NOT NULL,
ADD COLUMN     "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Device_fingerprint_key" ON "Device"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Device_did_key" ON "Device"("did");
