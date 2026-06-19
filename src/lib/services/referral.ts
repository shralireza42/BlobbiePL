import "server-only";
import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma, hasDatabase } from "../prisma";
import { config } from "../config";
import { REFERRAL_POINTS } from "../constants";
import { getOrCreateCampaign } from "./airdrop";

type Tx = Prisma.TransactionClient;

function newCode(): string {
  return randomBytes(4).toString("hex").toUpperCase(); // 8 chars
}

/** Ensure a user exists and has a referral code; returns the code. */
export async function ensureReferralCode(wallet: string): Promise<string | null> {
  if (!hasDatabase) return null;
  const lowered = wallet.toLowerCase();
  const user = await prisma.user.upsert({
    where: { wallet: lowered },
    update: { lastSeenAt: new Date() },
    create: { wallet: lowered },
    select: { referralCode: true },
  });
  if (user.referralCode) return user.referralCode;
  // Assign a unique code (retry on the rare collision).
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    try {
      await prisma.user.update({ where: { wallet: lowered }, data: { referralCode: code } });
      return code;
    } catch {
      /* collision — retry */
    }
  }
  return null;
}

export type ReferralProfile = {
  code: string | null;
  link: string | null;
  referredBy: string | null;
  referralCount: number;
  pointsEarned: number;
  rewards: { referrer: number; referee: number };
};

export async function getReferralProfile(wallet: string): Promise<ReferralProfile> {
  const rewards = { referrer: REFERRAL_POINTS.referrer, referee: REFERRAL_POINTS.referee };
  if (!hasDatabase) {
    return { code: null, link: null, referredBy: null, referralCount: 0, pointsEarned: 0, rewards };
  }
  const lowered = wallet.toLowerCase();
  const code = await ensureReferralCode(lowered);
  const [user, referrals] = await Promise.all([
    prisma.user.findUnique({ where: { wallet: lowered }, select: { referredBy: true } }),
    prisma.referral.findMany({ where: { referrerWallet: lowered }, select: { referrerPoints: true } }),
  ]);
  return {
    code,
    link: code ? `${config.siteUrl}/?ref=${code}` : null,
    referredBy: user?.referredBy ?? null,
    referralCount: referrals.length,
    pointsEarned: referrals.reduce((s, r) => s + r.referrerPoints, 0),
    rewards,
  };
}

async function grant(
  tx: Tx,
  campaignId: string,
  wallet: string,
  points: number,
  refId: string,
) {
  const lowered = wallet.toLowerCase();
  const user = await tx.user.upsert({
    where: { wallet: lowered },
    update: {},
    create: { wallet: lowered },
  });
  const au = await tx.airdropUser.upsert({
    where: { campaignId_wallet: { campaignId, wallet: lowered } },
    update: {},
    create: { userId: user.id, campaignId, wallet: lowered },
  });
  const total = au.totalPoints + points;
  await tx.airdropUser.update({ where: { id: au.id }, data: { totalPoints: total } });
  await tx.airdropPointsLedger.create({
    data: {
      campaignId,
      userId: user.id,
      wallet: lowered,
      delta: points,
      balanceAfter: total,
      reason: "TASK_COMPLETION",
      refType: "referral",
      refId,
    },
  });
}

export type ClaimReferralResult = { ok: boolean; message: string };

export async function claimReferral(
  refereeWallet: string,
  code: string,
  source: "link" | "admin" = "link",
  referrerWalletOverride?: string,
): Promise<ClaimReferralResult> {
  if (!hasDatabase) return { ok: false, message: "Database not configured." };
  const referee = refereeWallet.toLowerCase();
  const campaign = await getOrCreateCampaign();

  // Resolve referrer either from an explicit wallet (admin) or the code.
  let referrer: string | null = null;
  if (referrerWalletOverride) {
    referrer = referrerWalletOverride.toLowerCase();
  } else {
    const owner = await prisma.user.findUnique({
      where: { referralCode: code.toUpperCase() },
      select: { wallet: true },
    });
    referrer = owner?.wallet ?? null;
  }
  if (!referrer) return { ok: false, message: "Invalid referral code." };
  if (referrer === referee) return { ok: false, message: "You can't refer yourself." };

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.referral.findUnique({ where: { refereeWallet: referee } });
      if (existing) throw new Error("ALREADY");

      await tx.user.upsert({
        where: { wallet: referee },
        update: { referredBy: referrer! },
        create: { wallet: referee, referredBy: referrer! },
      });
      await tx.referral.create({
        data: {
          referrerWallet: referrer!,
          refereeWallet: referee,
          code: code.toUpperCase(),
          referrerPoints: REFERRAL_POINTS.referrer,
          refereePoints: REFERRAL_POINTS.referee,
          source,
        },
      });
      await grant(tx, campaign.id, referrer!, REFERRAL_POINTS.referrer, referee);
      await grant(tx, campaign.id, referee, REFERRAL_POINTS.referee, referrer!);
    });
    return {
      ok: true,
      message: `Referral confirmed! +${REFERRAL_POINTS.referee} points for you, +${REFERRAL_POINTS.referrer} for your friend.`,
    };
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY") {
      return { ok: false, message: "This wallet has already used a referral." };
    }
    return { ok: false, message: "Could not apply referral." };
  }
}

export async function getReferralAnalytics(limit = 20) {
  if (!hasDatabase) return { totalReferrals: 0, topReferrers: [] };
  try {
    const grouped = await prisma.referral.groupBy({
      by: ["referrerWallet"],
      _count: { _all: true },
      _sum: { referrerPoints: true },
      orderBy: { _count: { referrerWallet: "desc" } },
      take: limit,
    });
    const total = await prisma.referral.count();
    return {
      totalReferrals: total,
      topReferrers: grouped.map((g) => ({
        wallet: g.referrerWallet,
        count: g._count._all,
        points: g._sum.referrerPoints ?? 0,
      })),
    };
  } catch {
    return { totalReferrals: 0, topReferrers: [] };
  }
}
