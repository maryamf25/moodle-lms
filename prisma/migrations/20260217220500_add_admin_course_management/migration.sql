-- AlterEnum
ALTER TYPE "AdminAction" ADD VALUE IF NOT EXISTS 'COURSES_SYNCED';
ALTER TYPE "AdminAction" ADD VALUE IF NOT EXISTS 'COURSE_PRICING_UPDATED';
ALTER TYPE "AdminAction" ADD VALUE IF NOT EXISTS 'COURSE_CATEGORY_UPDATED';
ALTER TYPE "AdminAction" ADD VALUE IF NOT EXISTS 'COURSE_VISIBILITY_UPDATED';

-- CreateTable
CREATE TABLE "CourseCatalog" (
    "id" TEXT NOT NULL,
    "moodleCourseId" INTEGER NOT NULL,
    "shortname" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "summary" TEXT,
    "categoryId" INTEGER,
    "categoryName" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseCatalog_moodleCourseId_key" ON "CourseCatalog"("moodleCourseId");

-- CreateIndex
CREATE INDEX "CourseCatalog_categoryId_idx" ON "CourseCatalog"("categoryId");

-- CreateIndex
CREATE INDEX "CourseCatalog_isVisible_idx" ON "CourseCatalog"("isVisible");
