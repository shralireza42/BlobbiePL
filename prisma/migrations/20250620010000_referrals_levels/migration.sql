-- AlterTable
ALTER TABLE "User" ADD COLUMN     "levelOverride" INTEGER,
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredBy" TEXT;

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerWallet" TEXT NOT NULL,
    "refereeWallet" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "referrerPoints" INTEGER NOT NULL DEFAULT 0,
    "refereePoints" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'link',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_refereeWallet_key" ON "Referral"("refereeWallet");

-- CreateIndex
CREATE INDEX "Referral_referrerWallet_idx" ON "Referral"("referrerWallet");

-- CreateIndex
CREATE INDEX "Referral_createdAt_idx" ON "Referral"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

