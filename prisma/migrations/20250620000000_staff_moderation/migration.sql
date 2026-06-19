-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'MANAGER', 'MODERATOR', 'SENIOR');

-- CreateEnum
CREATE TYPE "SanctionScope" AS ENUM ('SITE_BAN', 'CHAT_BAN', 'CHAT_MUTE');

-- AlterTable
ALTER TABLE "DrawRound" ADD COLUMN     "cooldownEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedBy" TEXT;

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "addedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sanction" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "scope" "SanctionScope" NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "liftedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sanction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_wallet_key" ON "Staff"("wallet");

-- CreateIndex
CREATE INDEX "Staff_role_idx" ON "Staff"("role");

-- CreateIndex
CREATE INDEX "Sanction_wallet_idx" ON "Sanction"("wallet");

-- CreateIndex
CREATE INDEX "Sanction_scope_idx" ON "Sanction"("scope");

-- CreateIndex
CREATE INDEX "Sanction_liftedAt_idx" ON "Sanction"("liftedAt");

