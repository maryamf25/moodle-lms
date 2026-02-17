-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('USER_SUSPENDED', 'USER_UNSUSPENDED', 'PASSWORD_RESET', 'ROLE_ASSIGNED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastPasswordResetAt" TIMESTAMP(3),
ADD COLUMN "passwordResetCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AdminActivityLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" "AdminAction" NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_isSuspended_idx" ON "User"("isSuspended");

-- CreateIndex
CREATE INDEX "AdminActivityLog_adminUserId_createdAt_idx" ON "AdminActivityLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActivityLog_targetUserId_createdAt_idx" ON "AdminActivityLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActivityLog_createdAt_idx" ON "AdminActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AdminActivityLog" ADD CONSTRAINT "AdminActivityLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActivityLog" ADD CONSTRAINT "AdminActivityLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
