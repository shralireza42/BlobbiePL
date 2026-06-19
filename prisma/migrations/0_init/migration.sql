-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('X', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "SocialTaskStatus" AS ENUM ('NOT_STARTED', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('OPEN', 'CLOSING_SOON', 'FILLED', 'AWAITING_DRAW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('UNCLAIMED', 'CLAIMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AirdropEligibility" AS ENUM ('NOT_CONNECTED', 'ELIGIBLE', 'PENDING_REVIEW', 'FLAGGED', 'APPROVED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('ONE_TIME', 'DAILY', 'MANUAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ACTIVE', 'COMING_SOON', 'DISABLED');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('TASK_COMPLETION', 'DAILY_RETURN', 'DRAW_PARTICIPATION', 'ADMIN_ADJUSTMENT', 'PENALTY');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'FLAGGED', 'PENDING');

-- CreateEnum
CREATE TYPE "FraudReason" AS ENUM ('MULTI_ACCOUNT', 'IP_CLUSTER', 'DEVICE_CLUSTER', 'ABNORMAL_ACTIVITY', 'MANUAL_FLAG');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "ensName" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "ipHash" TEXT,
    "deviceHash" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "username" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAirdropTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" "SocialTaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "confirmedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "checkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAirdropTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawRound" (
    "id" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'OPEN',
    "capacity" INTEGER NOT NULL DEFAULT 300,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "totalTickets" INTEGER NOT NULL DEFAULT 0,
    "supplementTickets" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3) NOT NULL,
    "drawnAt" TIMESTAMP(3),
    "vrfRequestId" TEXT,
    "randomSeed" TEXT,
    "txHash" TEXT,
    "mockMode" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawEntry" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "ticketCount" INTEGER NOT NULL DEFAULT 0,
    "blobbieSpent" TEXT NOT NULL DEFAULT '0',
    "usdValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "txHash" TEXT,
    "mockMode" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawWinner" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "usdAmount" DOUBLE PRECISION NOT NULL,
    "blobbieAmount" TEXT NOT NULL DEFAULT '0',
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'UNCLAIMED',
    "claimTxHash" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawWinner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirdropCampaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirdropCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirdropTask" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "type" "TaskType" NOT NULL DEFAULT 'ONE_TIME',
    "status" "TaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "requiresAdmin" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirdropTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirdropUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "eligibility" "AirdropEligibility" NOT NULL DEFAULT 'ELIGIBLE',
    "reviewNotes" TEXT,
    "lastDailyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirdropUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirdropCompletion" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "dayBucket" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirdropCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirdropPointsLedger" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirdropPointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirdropReview" (
    "id" TEXT NOT NULL,
    "airdropUserId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reviewedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirdropReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "reason" "FraudReason" NOT NULL,
    "details" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "flaggedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "wallet" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminWallet" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_key" ON "User"("wallet");

-- CreateIndex
CREATE INDEX "User_wallet_idx" ON "User"("wallet");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_provider_providerUserId_key" ON "SocialAccount"("provider", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_userId_provider_key" ON "SocialAccount"("userId", "provider");

-- CreateIndex
CREATE INDEX "UserAirdropTask_userId_idx" ON "UserAirdropTask"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAirdropTask_userId_taskId_key" ON "UserAirdropTask"("userId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawRound_roundNumber_key" ON "DrawRound"("roundNumber");

-- CreateIndex
CREATE INDEX "DrawRound_status_idx" ON "DrawRound"("status");

-- CreateIndex
CREATE INDEX "DrawRound_createdAt_idx" ON "DrawRound"("createdAt");

-- CreateIndex
CREATE INDEX "DrawEntry_wallet_idx" ON "DrawEntry"("wallet");

-- CreateIndex
CREATE INDEX "DrawEntry_roundId_idx" ON "DrawEntry"("roundId");

-- CreateIndex
CREATE INDEX "DrawEntry_createdAt_idx" ON "DrawEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DrawEntry_roundId_userId_key" ON "DrawEntry"("roundId", "userId");

-- CreateIndex
CREATE INDEX "DrawWinner_wallet_idx" ON "DrawWinner"("wallet");

-- CreateIndex
CREATE INDEX "DrawWinner_roundId_idx" ON "DrawWinner"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawWinner_roundId_wallet_key" ON "DrawWinner"("roundId", "wallet");

-- CreateIndex
CREATE UNIQUE INDEX "DrawWinner_roundId_rank_key" ON "DrawWinner"("roundId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "AirdropCampaign_slug_key" ON "AirdropCampaign"("slug");

-- CreateIndex
CREATE INDEX "AirdropCampaign_slug_idx" ON "AirdropCampaign"("slug");

-- CreateIndex
CREATE INDEX "AirdropCampaign_createdAt_idx" ON "AirdropCampaign"("createdAt");

-- CreateIndex
CREATE INDEX "AirdropTask_campaignId_idx" ON "AirdropTask"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "AirdropTask_campaignId_key_key" ON "AirdropTask"("campaignId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AirdropUser_userId_key" ON "AirdropUser"("userId");

-- CreateIndex
CREATE INDEX "AirdropUser_wallet_idx" ON "AirdropUser"("wallet");

-- CreateIndex
CREATE INDEX "AirdropUser_campaignId_idx" ON "AirdropUser"("campaignId");

-- CreateIndex
CREATE INDEX "AirdropUser_totalPoints_idx" ON "AirdropUser"("totalPoints");

-- CreateIndex
CREATE INDEX "AirdropUser_createdAt_idx" ON "AirdropUser"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AirdropUser_campaignId_wallet_key" ON "AirdropUser"("campaignId", "wallet");

-- CreateIndex
CREATE INDEX "AirdropCompletion_wallet_idx" ON "AirdropCompletion"("wallet");

-- CreateIndex
CREATE INDEX "AirdropCompletion_campaignId_idx" ON "AirdropCompletion"("campaignId");

-- CreateIndex
CREATE INDEX "AirdropCompletion_createdAt_idx" ON "AirdropCompletion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AirdropCompletion_taskId_userId_dayBucket_key" ON "AirdropCompletion"("taskId", "userId", "dayBucket");

-- CreateIndex
CREATE INDEX "AirdropPointsLedger_wallet_idx" ON "AirdropPointsLedger"("wallet");

-- CreateIndex
CREATE INDEX "AirdropPointsLedger_campaignId_idx" ON "AirdropPointsLedger"("campaignId");

-- CreateIndex
CREATE INDEX "AirdropPointsLedger_userId_idx" ON "AirdropPointsLedger"("userId");

-- CreateIndex
CREATE INDEX "AirdropPointsLedger_createdAt_idx" ON "AirdropPointsLedger"("createdAt");

-- CreateIndex
CREATE INDEX "AirdropReview_wallet_idx" ON "AirdropReview"("wallet");

-- CreateIndex
CREATE INDEX "AirdropReview_createdAt_idx" ON "AirdropReview"("createdAt");

-- CreateIndex
CREATE INDEX "FraudFlag_wallet_idx" ON "FraudFlag"("wallet");

-- CreateIndex
CREATE INDEX "FraudFlag_createdAt_idx" ON "FraudFlag"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_wallet_idx" ON "ActivityLog"("wallet");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminWallet_idx" ON "AdminAuditLog"("adminWallet");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppConfig_key_key" ON "AppConfig"("key");

-- CreateIndex
CREATE INDEX "AppConfig_key_idx" ON "AppConfig"("key");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_wallet_idx" ON "ChatMessage"("wallet");

-- CreateIndex
CREATE INDEX "RateLimitHit_windowStart_idx" ON "RateLimitHit"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitHit_bucket_identifier_windowStart_key" ON "RateLimitHit"("bucket", "identifier", "windowStart");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAirdropTask" ADD CONSTRAINT "UserAirdropTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAirdropTask" ADD CONSTRAINT "UserAirdropTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AirdropTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawEntry" ADD CONSTRAINT "DrawEntry_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "DrawRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawEntry" ADD CONSTRAINT "DrawEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawWinner" ADD CONSTRAINT "DrawWinner_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "DrawRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirdropTask" ADD CONSTRAINT "AirdropTask_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AirdropCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirdropUser" ADD CONSTRAINT "AirdropUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirdropUser" ADD CONSTRAINT "AirdropUser_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AirdropCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirdropCompletion" ADD CONSTRAINT "AirdropCompletion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AirdropCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirdropCompletion" ADD CONSTRAINT "AirdropCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AirdropTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirdropCompletion" ADD CONSTRAINT "AirdropCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirdropPointsLedger" ADD CONSTRAINT "AirdropPointsLedger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AirdropCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirdropPointsLedger" ADD CONSTRAINT "AirdropPointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirdropReview" ADD CONSTRAINT "AirdropReview_airdropUserId_fkey" FOREIGN KEY ("airdropUserId") REFERENCES "AirdropUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

