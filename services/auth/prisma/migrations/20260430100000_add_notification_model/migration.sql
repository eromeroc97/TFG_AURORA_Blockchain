-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('READ_ONLY', 'ACTION_EXPECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ECOSYSTEM_DELEGATION_REQUEST');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'READ', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('INDIVIDUAL', 'GLOBAL');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('ECOSYSTEM', 'USER', 'DEVICE');

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "targetType" "TargetType" NOT NULL DEFAULT 'INDIVIDUAL',
    "actorType" "ActorType" NOT NULL DEFAULT 'USER',
    "actorId" UUID,
    "userId" UUID,
    "referenceId" UUID,
    "referenceType" "ReferenceType",
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "actionUrl" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_status_idx" ON "Notification"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_targetType_status_idx" ON "Notification"("targetType", "status");

-- CreateIndex
CREATE INDEX "Notification_category_idx" ON "Notification"("category");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
