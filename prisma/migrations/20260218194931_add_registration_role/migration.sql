-- CreateTable
CREATE TABLE "RegistrationRole" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationRole_username_key" ON "RegistrationRole"("username");

-- CreateIndex
CREATE INDEX "RegistrationRole_username_idx" ON "RegistrationRole"("username");
