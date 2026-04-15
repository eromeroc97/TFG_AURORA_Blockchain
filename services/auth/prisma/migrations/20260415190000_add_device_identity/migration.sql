-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "Device" ADD COLUMN "fingerprint" TEXT;
UPDATE "Device" SET "fingerprint" = "id" WHERE "fingerprint" IS NULL;
ALTER TABLE "Device" ALTER COLUMN "fingerprint" SET NOT NULL;
ALTER TABLE "Device" ADD COLUMN "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Device" ADD COLUMN "did" TEXT;
ALTER TABLE "Device" DROP COLUMN "localType";

-- CreateIndex
CREATE UNIQUE INDEX "Device_fingerprint_key" ON "Device"("fingerprint");
CREATE UNIQUE INDEX "Device_did_key" ON "Device"("did");
