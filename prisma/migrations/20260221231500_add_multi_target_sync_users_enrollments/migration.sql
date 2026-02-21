-- AlterEnum
ALTER TYPE "IntegrationSyncTarget" ADD VALUE IF NOT EXISTS 'USER_DIRECTORY';
ALTER TYPE "IntegrationSyncTarget" ADD VALUE IF NOT EXISTS 'ENROLLMENTS';

-- CreateTable
CREATE TABLE "UserCourseEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseCatalogId" TEXT NOT NULL,
    "moodleUserId" INTEGER NOT NULL,
    "moodleCourseId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),
    "progress" INTEGER,
    "grade" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCourseEnrollment_moodleUserId_moodleCourseId_key" ON "UserCourseEnrollment"("moodleUserId", "moodleCourseId");

-- CreateIndex
CREATE INDEX "UserCourseEnrollment_userId_isActive_idx" ON "UserCourseEnrollment"("userId", "isActive");

-- CreateIndex
CREATE INDEX "UserCourseEnrollment_courseCatalogId_isActive_idx" ON "UserCourseEnrollment"("courseCatalogId", "isActive");

-- CreateIndex
CREATE INDEX "UserCourseEnrollment_moodleCourseId_isActive_idx" ON "UserCourseEnrollment"("moodleCourseId", "isActive");

-- AddForeignKey
ALTER TABLE "UserCourseEnrollment" ADD CONSTRAINT "UserCourseEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCourseEnrollment" ADD CONSTRAINT "UserCourseEnrollment_courseCatalogId_fkey" FOREIGN KEY ("courseCatalogId") REFERENCES "CourseCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
