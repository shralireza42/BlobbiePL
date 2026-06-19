import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma, hasDatabase } from "../prisma";
import { getOrCreateCampaign } from "./airdrop";
import {
  socialConfig,
  xConfigured,
  telegramConfigured,
  SOCIAL_TASK_DEFS,
  SOCIAL_TASK_KEYS,
  type SocialTaskCode,
} from "../social/config";
import { shouldGrantBonus } from "../social/pure";

type Tx = Prisma.TransactionClient;

export { shouldGrantBonus };

export type SocialTaskView = {
  code: SocialTaskCode;
  points: number;
  status: "not_started" | "confirmed" | "failed";
  failedReason?: string | null;
};

export type SocialStatus = {
  databaseReady: boolean;
  x: {
    enabled: boolean;
    configured: boolean;
    connected: boolean;
    username: string | null;
    targetUsername: string;
    task: SocialTaskView;
  };
  telegram: {
    enabled: boolean;
    configured: boolean;
    connected: boolean;
    username: string | null;
    botUsername: string;
    channelUrl: string;
    task: SocialTaskView;
  };
  bonus: {
    unlocked: boolean;
    task: SocialTaskView;
  };
};

async function ensureSocialTasks(campaignId: string) {
  for (const def of SOCIAL_TASK_DEFS) {
    await prisma.airdropTask.upsert({
      where: { campaignId_key: { campaignId, key: def.key } },
      update: { title: def.title, description: def.description, points: def.points },
      create: {
        campaignId,
        key: def.key,
        title: def.title,
        description: def.description,
        points: def.points,
        type: "ONE_TIME",
        status: "ACTIVE",
        requiresAdmin: true,
        sortOrder: def.sortOrder,
      },
    });
  }
}

export async function getOrCreateUser(wallet: string) {
  const lowered = wallet.toLowerCase();
  return prisma.user.upsert({
    where: { wallet: lowered },
    update: { lastSeenAt: new Date() },
    create: { wallet: lowered },
  });
}

export type LinkResult = { ok: boolean; reason?: string };

/** Link an X/Telegram account to a user, enforcing 1:1 uniqueness. */
export async function linkSocialAccount(args: {
  userId: string;
  provider: "X" | "TELEGRAM";
  providerUserId: string;
  username?: string | null;
  accessTokenEncrypted?: string | null;
  refreshTokenEncrypted?: string | null;
}): Promise<LinkResult> {
  if (!hasDatabase) return { ok: false, reason: "Database not configured." };

  const existing = await prisma.socialAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: args.provider,
        providerUserId: args.providerUserId,
      },
    },
  });
  if (existing && existing.userId !== args.userId) {
    return {
      ok: false,
      reason:
        args.provider === "X"
          ? "This X account is already linked to another wallet."
          : "This Telegram account is already linked to another wallet.",
    };
  }

  await prisma.socialAccount.upsert({
    where: { userId_provider: { userId: args.userId, provider: args.provider } },
    update: {
      providerUserId: args.providerUserId,
      username: args.username ?? undefined,
      accessTokenEncrypted: args.accessTokenEncrypted ?? undefined,
      refreshTokenEncrypted: args.refreshTokenEncrypted ?? undefined,
      connectedAt: new Date(),
    },
    create: {
      userId: args.userId,
      provider: args.provider,
      providerUserId: args.providerUserId,
      username: args.username ?? null,
      accessTokenEncrypted: args.accessTokenEncrypted ?? null,
      refreshTokenEncrypted: args.refreshTokenEncrypted ?? null,
    },
  });
  return { ok: true };
}

export async function getSocialAccount(userId: string, provider: "X" | "TELEGRAM") {
  if (!hasDatabase) return null;
  return prisma.socialAccount.findUnique({
    where: { userId_provider: { userId, provider } },
  });
}

export type ConfirmResult = {
  ok: boolean;
  code: SocialTaskCode;
  status: "confirmed" | "failed";
  points: number;
  message: string;
  alreadyConfirmed?: boolean;
  bonusGranted?: boolean;
  bonusPoints?: number;
  totalPoints?: number;
};

/** Confirm a social task: idempotent, transactional, grants points + bonus. */
export async function confirmSocialTask(
  wallet: string,
  code: Exclude<SocialTaskCode, "BONUS_SOCIAL">,
  message: string,
): Promise<ConfirmResult> {
  const campaign = await getOrCreateCampaign();
  await ensureSocialTasks(campaign.id);
  const lowered = wallet.toLowerCase();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { wallet: lowered },
      update: { lastSeenAt: new Date() },
      create: { wallet: lowered },
    });
    const airdropUser = await tx.airdropUser.upsert({
      where: { campaignId_wallet: { campaignId: campaign.id, wallet: lowered } },
      update: {},
      create: { userId: user.id, campaignId: campaign.id, wallet: lowered },
    });

    const grant = await grantTaskIfNeeded(
      tx,
      campaign.id,
      user.id,
      lowered,
      SOCIAL_TASK_KEYS[code],
      airdropUser.totalPoints,
    );

    if (grant.alreadyConfirmed) {
      return {
        ok: false,
        code,
        status: "confirmed",
        points: grant.points,
        alreadyConfirmed: true,
        message: "This task has already been confirmed.",
        totalPoints: grant.totalAfter,
      } satisfies ConfirmResult;
    }

    await tx.airdropUser.update({
      where: { id: airdropUser.id },
      data: { totalPoints: grant.totalAfter },
    });

    // Bonus check (one-time) once both social tasks are confirmed.
    const bonus = await maybeGrantBonus(
      tx,
      campaign.id,
      user.id,
      lowered,
      grant.totalAfter,
    );
    if (bonus.granted) {
      await tx.airdropUser.update({
        where: { id: airdropUser.id },
        data: { totalPoints: bonus.totalAfter },
      });
    }

    return {
      ok: true,
      code,
      status: "confirmed",
      points: grant.points,
      message,
      bonusGranted: bonus.granted,
      bonusPoints: bonus.points,
      totalPoints: bonus.granted ? bonus.totalAfter : grant.totalAfter,
    } satisfies ConfirmResult;
  });
}

async function grantTaskIfNeeded(
  tx: Tx,
  campaignId: string,
  userId: string,
  wallet: string,
  taskKey: string,
  currentTotal: number,
) {
  const task = await tx.airdropTask.findUnique({
    where: { campaignId_key: { campaignId, key: taskKey } },
  });
  if (!task) throw new Error("Social task not found");

  const uat = await tx.userAirdropTask.upsert({
    where: { userId_taskId: { userId, taskId: task.id } },
    update: { lastCheckedAt: new Date(), checkCount: { increment: 1 } },
    create: {
      userId,
      taskId: task.id,
      status: "NOT_STARTED",
      lastCheckedAt: new Date(),
      checkCount: 1,
    },
  });

  if (uat.status === "CONFIRMED") {
    return { alreadyConfirmed: true, points: task.points, totalAfter: currentTotal };
  }

  const totalAfter = currentTotal + task.points;
  await tx.userAirdropTask.update({
    where: { id: uat.id },
    data: { status: "CONFIRMED", confirmedAt: new Date(), failedReason: null },
  });
  await tx.airdropPointsLedger.create({
    data: {
      campaignId,
      userId,
      wallet,
      delta: task.points,
      balanceAfter: totalAfter,
      reason: "TASK_COMPLETION",
      refType: "social_task",
      refId: task.id,
    },
  });
  await tx.activityLog.create({
    data: {
      userId,
      wallet,
      type: "social_task",
      message: `Confirmed "${task.title}" (+${task.points} pts)`,
    },
  });
  return { alreadyConfirmed: false, points: task.points, totalAfter };
}

async function maybeGrantBonus(
  tx: Tx,
  campaignId: string,
  userId: string,
  wallet: string,
  currentTotal: number,
) {
  const keys = [SOCIAL_TASK_KEYS.FOLLOW_X, SOCIAL_TASK_KEYS.JOIN_TELEGRAM];
  const tasks = await tx.airdropTask.findMany({
    where: { campaignId, key: { in: [...keys, SOCIAL_TASK_KEYS.BONUS_SOCIAL] } },
  });
  const byKey = Object.fromEntries(tasks.map((t) => [t.key, t]));
  const followX = byKey[SOCIAL_TASK_KEYS.FOLLOW_X];
  const joinTg = byKey[SOCIAL_TASK_KEYS.JOIN_TELEGRAM];
  const bonus = byKey[SOCIAL_TASK_KEYS.BONUS_SOCIAL];
  if (!followX || !joinTg || !bonus) {
    return { granted: false, points: 0, totalAfter: currentTotal };
  }

  const states = await tx.userAirdropTask.findMany({
    where: { userId, taskId: { in: [followX.id, joinTg.id, bonus.id] } },
  });
  const status = (taskId: string) =>
    states.find((s) => s.taskId === taskId)?.status ?? "NOT_STARTED";

  if (
    !shouldGrantBonus(
      status(followX.id) === "CONFIRMED",
      status(joinTg.id) === "CONFIRMED",
      status(bonus.id) === "CONFIRMED",
    )
  ) {
    return { granted: false, points: 0, totalAfter: currentTotal };
  }

  const totalAfter = currentTotal + bonus.points;
  await tx.userAirdropTask.upsert({
    where: { userId_taskId: { userId, taskId: bonus.id } },
    update: { status: "CONFIRMED", confirmedAt: new Date() },
    create: {
      userId,
      taskId: bonus.id,
      status: "CONFIRMED",
      confirmedAt: new Date(),
    },
  });
  await tx.airdropPointsLedger.create({
    data: {
      campaignId,
      userId,
      wallet,
      delta: bonus.points,
      balanceAfter: totalAfter,
      reason: "TASK_COMPLETION",
      refType: "social_bonus",
      refId: bonus.id,
    },
  });
  return { granted: true, points: bonus.points, totalAfter };
}

export async function failSocialTask(
  wallet: string,
  code: Exclude<SocialTaskCode, "BONUS_SOCIAL">,
  reason: string,
) {
  if (!hasDatabase) return;
  const campaign = await getOrCreateCampaign();
  const lowered = wallet.toLowerCase();
  const user = await getOrCreateUser(lowered);
  const task = await prisma.airdropTask.findUnique({
    where: { campaignId_key: { campaignId: campaign.id, key: SOCIAL_TASK_KEYS[code] } },
  });
  if (!task) return;
  await prisma.userAirdropTask.upsert({
    where: { userId_taskId: { userId: user.id, taskId: task.id } },
    update: {
      // Never downgrade a confirmed task.
      status: "FAILED",
      failedAt: new Date(),
      failedReason: reason,
      lastCheckedAt: new Date(),
      checkCount: { increment: 1 },
    },
    create: {
      userId: user.id,
      taskId: task.id,
      status: "FAILED",
      failedAt: new Date(),
      failedReason: reason,
      lastCheckedAt: new Date(),
      checkCount: 1,
    },
  });
}

const STATUS_MAP = {
  CONFIRMED: "confirmed",
  FAILED: "failed",
  NOT_STARTED: "not_started",
} as const;

export async function getSocialStatus(wallet: string | null): Promise<SocialStatus> {
  const base: SocialStatus = {
    databaseReady: hasDatabase,
    x: {
      enabled: socialConfig.x.enabled,
      configured: xConfigured(),
      connected: false,
      username: null,
      targetUsername: socialConfig.x.targetUsername,
      task: { code: "FOLLOW_X", points: socialConfig.points.FOLLOW_X, status: "not_started" },
    },
    telegram: {
      enabled: socialConfig.telegram.enabled,
      configured: telegramConfigured(),
      connected: false,
      username: null,
      botUsername: socialConfig.telegram.botUsername,
      channelUrl: socialConfig.telegram.channelUrl,
      task: { code: "JOIN_TELEGRAM", points: socialConfig.points.JOIN_TELEGRAM, status: "not_started" },
    },
    bonus: {
      unlocked: false,
      task: { code: "BONUS_SOCIAL", points: socialConfig.points.BONUS_SOCIAL, status: "not_started" },
    },
  };

  if (!wallet || !hasDatabase) return base;

  try {
    const lowered = wallet.toLowerCase();
    const campaign = await getOrCreateCampaign();
    await ensureSocialTasks(campaign.id);
    const user = await prisma.user.findUnique({ where: { wallet: lowered } });
    if (!user) return base;

    const [accounts, tasks] = await Promise.all([
      prisma.socialAccount.findMany({ where: { userId: user.id } }),
      prisma.airdropTask.findMany({
        where: { campaignId: campaign.id, key: { in: Object.values(SOCIAL_TASK_KEYS) } },
        include: { userTasks: { where: { userId: user.id } } },
      }),
    ]);

    const taskByKey = Object.fromEntries(tasks.map((t) => [t.key, t]));
    const statusFor = (key: string): SocialTaskView["status"] => {
      const t = taskByKey[key];
      const s = t?.userTasks[0]?.status ?? "NOT_STARTED";
      return STATUS_MAP[s];
    };
    const reasonFor = (key: string) =>
      taskByKey[key]?.userTasks[0]?.failedReason ?? null;

    const xAccount = accounts.find((a) => a.provider === "X");
    const tgAccount = accounts.find((a) => a.provider === "TELEGRAM");

    base.x.connected = !!xAccount;
    base.x.username = xAccount?.username ?? null;
    base.x.task.status = statusFor(SOCIAL_TASK_KEYS.FOLLOW_X);
    base.x.task.failedReason = reasonFor(SOCIAL_TASK_KEYS.FOLLOW_X);

    base.telegram.connected = !!tgAccount;
    base.telegram.username = tgAccount?.username ?? null;
    base.telegram.task.status = statusFor(SOCIAL_TASK_KEYS.JOIN_TELEGRAM);
    base.telegram.task.failedReason = reasonFor(SOCIAL_TASK_KEYS.JOIN_TELEGRAM);

    base.bonus.task.status = statusFor(SOCIAL_TASK_KEYS.BONUS_SOCIAL);
    base.bonus.unlocked =
      base.x.task.status === "confirmed" && base.telegram.task.status === "confirmed";

    return base;
  } catch {
    return base;
  }
}
