-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GLOBAL_ADMIN', 'AUDITOR', 'OWNER');

-- CreateEnum
CREATE TYPE "EcosystemStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "did" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ecosystem" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "did" TEXT,
    "certificateFingerprint" TEXT,
    "status" "EcosystemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ecosystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" UUID NOT NULL,
    "ecosystemId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "localType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_did_key" ON "User"("did");

-- CreateIndex
CREATE UNIQUE INDEX "Ecosystem_did_key" ON "Ecosystem"("did");

-- CreateIndex
CREATE UNIQUE INDEX "Ecosystem_certificateFingerprint_key" ON "Ecosystem"("certificateFingerprint");

-- CreateIndex
CREATE INDEX "Ecosystem_ownerId_idx" ON "Ecosystem"("ownerId");

-- CreateIndex
CREATE INDEX "Device_ecosystemId_idx" ON "Device"("ecosystemId");

-- AddForeignKey
ALTER TABLE "Ecosystem" ADD CONSTRAINT "Ecosystem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_ecosystemId_fkey" FOREIGN KEY ("ecosystemId") REFERENCES "Ecosystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
