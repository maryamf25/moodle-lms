-- CreateTable
CREATE TABLE "SchoolLicense" (
    "id" TEXT NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "moodleCourseId" INTEGER NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "usedSeats" INTEGER NOT NULL DEFAULT 0,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "SchoolLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseSeatAssignment" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseSeatAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolLicense_schoolId_idx" ON "SchoolLicense"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolLicense_moodleCourseId_idx" ON "SchoolLicense"("moodleCourseId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolLicense_schoolId_moodleCourseId_key" ON "SchoolLicense"("schoolId", "moodleCourseId");

-- CreateIndex
CREATE INDEX "LicenseSeatAssignment_licenseId_idx" ON "LicenseSeatAssignment"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseSeatAssignment_studentId_idx" ON "LicenseSeatAssignment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseSeatAssignment_licenseId_studentId_key" ON "LicenseSeatAssignment"("licenseId", "studentId");

-- AddForeignKey
ALTER TABLE "LicenseSeatAssignment" ADD CONSTRAINT "LicenseSeatAssignment_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "SchoolLicense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
