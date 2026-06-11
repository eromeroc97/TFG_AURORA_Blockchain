-- CreateEnum
CREATE TYPE "AccessRole" AS ENUM ('VIEWER', 'EDITOR');

-- CreateTable
CREATE TABLE "EcosystemAccess" (
    "id" UUID NOT NULL,
    "ecosystemId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "AccessRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcosystemAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EcosystemAccess_ecosystemId_userId_key" ON "EcosystemAccess"("ecosystemId", "userId");

-- CreateIndex
CREATE INDEX "EcosystemAccess_ecosystemId_idx" ON "EcosystemAccess"("ecosystemId");

-- CreateIndex
CREATE INDEX "EcosystemAccess_userId_idx" ON "EcosystemAccess"("userId");

-- AddForeignKey
ALTER TABLE "EcosystemAccess" ADD CONSTRAINT "EcosystemAccess_ecosystemId_fkey" FOREIGN KEY ("ecosystemId") REFERENCES "Ecosystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcosystemAccess" ADD CONSTRAINT "EcosystemAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
