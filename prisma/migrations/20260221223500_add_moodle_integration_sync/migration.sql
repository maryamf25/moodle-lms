-- CreateEnum
CREATE TYPE "IntegrationSyncTarget" AS ENUM ('COURSE_CATALOG');

-- CreateEnum
CREATE TYPE "IntegrationSyncRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "IntegrationSyncConfig" (
    "id" TEXT NOT NULL,
    "target" "IntegrationSyncTarget" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "frequencyMinutes" INTEGER NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSyncConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSyncRun" (
    "id" TEXT NOT NULL,
    "target" "IntegrationSyncTarget" NOT NULL,
    "status" "IntegrationSyncRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "itemsSynced" INTEGER,
    "itemsFailed" INTEGER,
    "metadata" JSONB,
    "error" TEXT,
    "configId" TEXT,

    CONSTRAINT "IntegrationSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSyncConfig_target_key" ON "IntegrationSyncConfig"("target");

-- CreateIndex
CREATE INDEX "IntegrationSyncConfig_enabled_nextRunAt_idx" ON "IntegrationSyncConfig"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "IntegrationSyncRun_target_startedAt_idx" ON "IntegrationSyncRun"("target", "startedAt");

-- CreateIndex
CREATE INDEX "IntegrationSyncRun_status_startedAt_idx" ON "IntegrationSyncRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "IntegrationSyncRun_configId_startedAt_idx" ON "IntegrationSyncRun"("configId", "startedAt");

-- AddForeignKey
ALTER TABLE "IntegrationSyncRun" ADD CONSTRAINT "IntegrationSyncRun_configId_fkey" FOREIGN KEY ("configId") REFERENCES "IntegrationSyncConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
