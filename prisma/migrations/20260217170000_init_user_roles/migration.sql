-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'student', 'parent', 'school');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "moodleUserId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_moodleUserId_key" ON "User"("moodleUserId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
