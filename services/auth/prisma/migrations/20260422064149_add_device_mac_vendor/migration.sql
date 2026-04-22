/*
  Warnings:

  - A unique constraint covering the columns `[ecosystemId,macAddress]` on the table `Device` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "macAddress" VARCHAR(255),
ADD COLUMN     "vendor" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Device_ecosystemId_macAddress_key" ON "Device"("ecosystemId", "macAddress");
