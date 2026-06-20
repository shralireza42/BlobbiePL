-- Blobbie — apply ALL pending schema changes to an existing database.
--
-- Safe to paste into the Neon SQL Editor and Run at any time: every statement
-- is idempotent (IF NOT EXISTS / guarded enum creation), so re-running it does
-- nothing if a change is already applied.
--
-- Covers: staff & moderation, referrals & levels, username metadata, and the
-- bug bounty reports table.

-- ── Enums ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'MANAGER', 'MODERATOR', 'SENIOR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SanctionScope" AS ENUM ('SITE_BAN', 'CHAT_BAN', 'CHAT_MUTE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "BugSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "BugReportStatus" AS ENUM ('NEW', 'TRIAGED', 'ACCEPTED', 'DUPLICATE', 'REJECTED', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── New columns ──────────────────────────────────────────────────────────
ALTER TABLE "DrawRound"   ADD COLUMN IF NOT EXISTS "cooldownEndsAt" TIMESTAMP(3);

ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deleted"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode"         TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredBy"           TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "levelOverride"        INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayNameUpdatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");

-- ── Staff ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Staff" (
  "id"        TEXT NOT NULL,
  "wallet"    TEXT NOT NULL,
  "role"      "StaffRole" NOT NULL,
  "addedBy"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Staff_wallet_key" ON "Staff"("wallet");
CREATE INDEX IF NOT EXISTS "Staff_role_idx" ON "Staff"("role");

-- ── Sanction (bans / mutes) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Sanction" (
  "id"        TEXT NOT NULL,
  "wallet"    TEXT NOT NULL,
  "scope"     "SanctionScope" NOT NULL,
  "reason"    TEXT,
  "expiresAt" TIMESTAMP(3),
  "liftedAt"  TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sanction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Sanction_wallet_idx"   ON "Sanction"("wallet");
CREATE INDEX IF NOT EXISTS "Sanction_scope_idx"    ON "Sanction"("scope");
CREATE INDEX IF NOT EXISTS "Sanction_liftedAt_idx" ON "Sanction"("liftedAt");

-- ── Referral ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Referral" (
  "id"             TEXT NOT NULL,
  "referrerWallet" TEXT NOT NULL,
  "refereeWallet"  TEXT NOT NULL,
  "code"           TEXT NOT NULL,
  "referrerPoints" INTEGER NOT NULL DEFAULT 0,
  "refereePoints"  INTEGER NOT NULL DEFAULT 0,
  "source"         TEXT NOT NULL DEFAULT 'link',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Referral_refereeWallet_key" ON "Referral"("refereeWallet");
CREATE INDEX IF NOT EXISTS "Referral_referrerWallet_idx" ON "Referral"("referrerWallet");
CREATE INDEX IF NOT EXISTS "Referral_createdAt_idx" ON "Referral"("createdAt");

-- ── Bug Bounty reports ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "BugReport" (
  "id"             TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "severity"       "BugSeverity" NOT NULL,
  "category"       TEXT NOT NULL,
  "description"    TEXT NOT NULL,
  "steps"          TEXT,
  "impact"         TEXT,
  "contact"        TEXT,
  "reporterWallet" TEXT,
  "rewardWallet"   TEXT,
  "status"         "BugReportStatus" NOT NULL DEFAULT 'NEW',
  "ipHash"         TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BugReport_status_idx"    ON "BugReport"("status");
CREATE INDEX IF NOT EXISTS "BugReport_severity_idx"  ON "BugReport"("severity");
CREATE INDEX IF NOT EXISTS "BugReport_createdAt_idx" ON "BugReport"("createdAt");
