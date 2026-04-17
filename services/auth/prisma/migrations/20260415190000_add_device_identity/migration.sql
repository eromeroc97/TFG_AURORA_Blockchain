DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeviceStatus') THEN
		CREATE TYPE "DeviceStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');
	END IF;
END $$;

ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT;
UPDATE "Device" SET "fingerprint" = "id" WHERE "fingerprint" IS NULL;
ALTER TABLE "Device" ALTER COLUMN "fingerprint" SET NOT NULL;

ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "did" TEXT;
ALTER TABLE "Device" DROP COLUMN IF EXISTS "localType";

CREATE UNIQUE INDEX IF NOT EXISTS "Device_fingerprint_key" ON "Device"("fingerprint");
CREATE UNIQUE INDEX IF NOT EXISTS "Device_did_key" ON "Device"("did");
