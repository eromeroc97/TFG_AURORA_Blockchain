/*
  Warnings:

  - You are about to drop the column `did` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `fingerprint` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Device` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Device_did_key";

-- DropIndex
DROP INDEX "Device_fingerprint_key";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "did",
DROP COLUMN "fingerprint",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "DeviceStatus";
