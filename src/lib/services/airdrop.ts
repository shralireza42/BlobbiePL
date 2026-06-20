import "server-only";
import { prisma, hasDatabase } from "../prisma";
import {
  AIRDROP_TASKS,
  DEFAULT_CAMPAIGN_SLUG,
  type AirdropTaskKey,
} from "../constants";
import { utcDayBucket } from "../format";

export type AirdropTaskView = {
  key: string;
  title: string;
  description: string;
  points: number;
  type: "ONE_TIME" | "DAILY" | "MANUAL";
  status: "ACTIVE" | "COMING_SOON" | "DISABLED";
  requiresAdmin: boolean;
  completed: boolean;
  pending: boolean; // manual task awaiting admin approval
};

export type AirdropProfile = {
  connected: boolean;
  wallet: string | null;
  totalPoints: number;
  rank: number | null;
  eligibility:
    | "NOT_CONNECTED"
    | "ELIGIBLE"
    | "PENDING_REVIEW"
    | "FLAGGED"
    | "APPROVED";
  tasks: AirdropTaskView[];
  completedCount: number;
  pendingCount: number;
  isMock: boolean;
};

function baseTasks(): AirdropTaskView[] {
  return AIRDROP_TASKS.map((t) => ({
    key: t.key,
    title: t.title,
    description: t.description,
    points: t.points,
    type: t.type,
    status: t.status,
    requiresAdmin: t.requiresAdmin,
    completed: false,
    pending: false,
  }));
}

export async function getAirdropProfile(
  wallet: string | null,
): Promise<AirdropProfile> {
  const tasks = baseTasks();

  if (!wallet) {
    return {
      connected: false,
      wallet: null,
      totalPoints: 0,
      rank: null,
      eligibility: "NOT_CONNECTED",
      tasks,
      completedCount: 0,
      pendingCount: 0,
      isMock: !hasDatabase,
    };
  }

  const lowered = wallet.toLowerCase();

  if (!hasDatabase) {
    return {
      connected: true,
      wallet: lowered,
      totalPoints: 0,
      rank: null,
      eligibility: "ELIGIBLE",
      tasks,
      completedCount: 0,
      pendingCount: 0,
      isMock: true,
    };
  }

  try {
    const campaign = await getOrCreateCampaign();
    const airdropUser = await prisma.airdropUser.findUnique({
      where: { campaignId_wallet: { campaignId: campaign.id, wallet: lowered } },
    });

    const completions = await prisma.airdropCompletion.findMany({
      where: { campaignId: campaign.id, wallet: lowered },
      include: { task: true },
    });

    const today = utcDayBucket();
    const completedKeys = new Set<string>();
    const pendingKeys = new Set<string>();
    for (const c of completions) {
      const key = c.task.key;
      if (c.task.type === "DAILY") {
        if (c.dayBucket === today) {
          c.approved ? completedKeys.add(key) : pendingKeys.add(key);
        }
      } else {
        c.approved ? completedKeys.add(key) : pendingKeys.add(key);
      }
    }

    const merged = tasks.map((t) => ({
      ...t,
      completed: completedKeys.has(t.key),
      pending: pendingKeys.has(t.key),
    }));

    let rank: number | null = airdropUser?.rank ?? null;
    if (airdropUser) {
      rank =
        (await prisma.airdropUser.count({
          where: {
            campaignId: campaign.id,
            totalPoints: { gt: airdropUser.totalPoints },
          },
        })) + 1;
    }

    return {
      connected: true,
      wallet: lowered,
      totalPoints: airdropUser?.totalPoints ?? 0,
      rank,
      eligibility: (airdropUser?.eligibility ?? "ELIGIBLE") as AirdropProfile["eligibility"],
      tasks: merged,
      completedCount: merged.filter((t) => t.completed).length,
      pendingCount: merged.filter((t) => t.pending).length,
      isMock: false,
    };
  } catch {
    return {
      connected: true,
      wallet: lowered,
      totalPoints: 0,
      rank: null,
      eligibility: "ELIGIBLE",
      tasks,
      completedCount: 0,
      pendingCount: 0,
      isMock: true,
    };
  }
}

/** Tasks granted only by the server (not via the public claim endpoint). */
const NON_CLAIMABLE_TASKS = new Set<string>(["top_winner"]);

export type ClaimResult = {
  ok: boolean;
  awarded: number;
  totalPoints: number;
  pending?: boolean;
  message: string;
};

/**
 * Claim/complete a task. Points are computed server-side from the task
 * definition (never trusted from the client). Duplicate claims are prevented by
 * the unique (taskId, userId, dayBucket) constraint. Ledger writes are wrapped
 * in a transaction.
 */
export async function claimTask(
  wallet: string,
  taskKey: AirdropTaskKey | string,
  context?: { ipHash?: string; deviceHash?: string },
): Promise<ClaimResult> {
  if (!hasDatabase) {
    return {
      ok: false,
      awarded: 0,
      totalPoints: 0,
      message: "Database not configured — running in Beta Mock Mode.",
    };
  }

  const lowered = wallet.toLowerCase();

  // Some tasks are granted automatically by the server (never self-claimable).
  // e.g. the top-winner bonus is awarded when a Daily Draw round settles.
  if (NON_CLAIMABLE_TASKS.has(taskKey)) {
    return {
      ok: false,
      awarded: 0,
      totalPoints: 0,
      message: "This task is awarded automatically and can't be claimed here.",
    };
  }

  // Verify action-based tasks actually happened (no free claims).
  if (taskKey === "buy_ticket") {
    const tickets = await prisma.drawEntry.count({ where: { wallet: lowered } });
    if (tickets === 0) {
      return {
        ok: false,
        awarded: 0,
        totalPoints: 0,
        message: "Buy a Daily Rewards Draw ticket first to earn this.",
      };
    }
  }

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.airdropCampaign.findUnique({
      where: { slug: DEFAULT_CAMPAIGN_SLUG },
    });
    if (!campaign) throw new Error("Campaign not found");

    const task = await tx.airdropTask.findUnique({
      where: { campaignId_key: { campaignId: campaign.id, key: taskKey } },
    });
    if (!task) throw new Error("Task not found");
    if (task.status !== "ACTIVE") {
      return {
        ok: false,
        awarded: 0,
        totalPoints: 0,
        message: "This task is not active yet.",
      };
    }

    const user = await tx.user.upsert({
      where: { wallet: lowered },
      update: {
        lastSeenAt: new Date(),
        ...(context?.ipHash ? { ipHash: context.ipHash } : {}),
        ...(context?.deviceHash ? { deviceHash: context.deviceHash } : {}),
      },
      create: {
        wallet: lowered,
        ipHash: context?.ipHash,
        deviceHash: context?.deviceHash,
      },
    });

    const airdropUser = await tx.airdropUser.upsert({
      where: {
        campaignId_wallet: { campaignId: campaign.id, wallet: lowered },
      },
      update: {},
      create: {
        userId: user.id,
        campaignId: campaign.id,
        wallet: lowered,
      },
    });

    if (airdropUser.eligibility === "FLAGGED") {
      return {
        ok: false,
        awarded: 0,
        totalPoints: airdropUser.totalPoints,
        message: "Account flagged for review. Points are paused.",
      };
    }

    const dayBucket = task.type === "DAILY" ? utcDayBucket() : null;

    const existing = await tx.airdropCompletion.findUnique({
      where: {
        taskId_userId_dayBucket: {
          taskId: task.id,
          userId: user.id,
          dayBucket: dayBucket ?? "",
        },
      },
    });
    if (existing) {
      return {
        ok: false,
        awarded: 0,
        totalPoints: airdropUser.totalPoints,
        pending: !existing.approved,
        message:
          task.type === "DAILY"
            ? "Already claimed today. Come back tomorrow."
            : existing.approved
              ? "Task already completed."
              : "Task already submitted, pending review.",
      };
    }

    // MANUAL tasks require admin approval: record but don't award yet.
    const autoApprove = !task.requiresAdmin;

    await tx.airdropCompletion.create({
      data: {
        campaignId: campaign.id,
        taskId: task.id,
        userId: user.id,
        wallet: lowered,
        pointsAwarded: autoApprove ? task.points : 0,
        dayBucket,
        approved: autoApprove,
      },
    });

    if (!autoApprove) {
      await tx.airdropUser.update({
        where: { id: airdropUser.id },
        data: { eligibility: "PENDING_REVIEW" },
      });
      return {
        ok: true,
        awarded: 0,
        totalPoints: airdropUser.totalPoints,
        pending: true,
        message: "Submitted. Awaiting manual verification.",
      };
    }

    const newTotal = airdropUser.totalPoints + task.points;
    await tx.airdropUser.update({
      where: { id: airdropUser.id },
      data: { totalPoints: newTotal, lastDailyAt: dayBucket ? new Date() : undefined },
    });

    await tx.airdropPointsLedger.create({
      data: {
        campaignId: campaign.id,
        userId: user.id,
        wallet: lowered,
        delta: task.points,
        balanceAfter: newTotal,
        reason: task.type === "DAILY" ? "DAILY_RETURN" : "TASK_COMPLETION",
        refType: "task",
        refId: task.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: user.id,
        wallet: lowered,
        type: "airdrop_task",
        message: `Completed task "${task.title}" (+${task.points} pts)`,
      },
    });

    return {
      ok: true,
      awarded: task.points,
      totalPoints: newTotal,
      message: `+${task.points} Airdrop Points awarded.`,
    };
  });
}

/**
 * Award a verifiable task (e.g. social follow/join) AFTER server-side
 * verification has passed. Safe to call repeatedly — duplicate awards are
 * prevented by the unique completion constraint and an approved-check.
 */
export async function awardVerifiedTask(
  wallet: string,
  taskKey: string,
): Promise<ClaimResult> {
  if (!hasDatabase) {
    return {
      ok: false,
      awarded: 0,
      totalPoints: 0,
      message: "Database not configured — running in Beta Mock Mode.",
    };
  }
  const lowered = wallet.toLowerCase();

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.airdropCampaign.findUnique({
      where: { slug: DEFAULT_CAMPAIGN_SLUG },
    });
    if (!campaign) throw new Error("Campaign not found");
    const task = await tx.airdropTask.findUnique({
      where: { campaignId_key: { campaignId: campaign.id, key: taskKey } },
    });
    if (!task) throw new Error("Task not found");

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

    const existing = await tx.airdropCompletion.findUnique({
      where: {
        taskId_userId_dayBucket: { taskId: task.id, userId: user.id, dayBucket: "" },
      },
    });
    if (existing?.approved) {
      return {
        ok: false,
        awarded: 0,
        totalPoints: airdropUser.totalPoints,
        message: "Task already completed.",
      };
    }

    if (existing) {
      await tx.airdropCompletion.update({
        where: { id: existing.id },
        data: { approved: true, pointsAwarded: task.points },
      });
    } else {
      await tx.airdropCompletion.create({
        data: {
          campaignId: campaign.id,
          taskId: task.id,
          userId: user.id,
          wallet: lowered,
          pointsAwarded: task.points,
          dayBucket: null,
          approved: true,
        },
      });
    }

    const newTotal = airdropUser.totalPoints + task.points;
    await tx.airdropUser.update({
      where: { id: airdropUser.id },
      data: {
        totalPoints: newTotal,
        eligibility:
          airdropUser.eligibility === "PENDING_REVIEW"
            ? "ELIGIBLE"
            : airdropUser.eligibility,
      },
    });
    await tx.airdropPointsLedger.create({
      data: {
        campaignId: campaign.id,
        userId: user.id,
        wallet: lowered,
        delta: task.points,
        balanceAfter: newTotal,
        reason: "TASK_COMPLETION",
        refType: "verified_task",
        refId: task.id,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        wallet: lowered,
        type: "airdrop_verified",
        message: `Verified task "${task.title}" (+${task.points} pts)`,
      },
    });

    return {
      ok: true,
      awarded: task.points,
      totalPoints: newTotal,
      message: `Verified! +${task.points} Airdrop Points.`,
    };
  });
}

export async function getLeaderboard(limit = 50) {
  if (!hasDatabase) return [];
  try {
    const campaign = await getOrCreateCampaign();
    return prisma.airdropUser.findMany({
      where: { campaignId: campaign.id },
      orderBy: { totalPoints: "desc" },
      take: limit,
      select: { wallet: true, totalPoints: true, eligibility: true },
    });
  } catch {
    return [];
  }
}

export async function getOrCreateCampaign() {
  const existing = await prisma.airdropCampaign.findUnique({
    where: { slug: DEFAULT_CAMPAIGN_SLUG },
  });
  if (existing) return existing;
  return prisma.airdropCampaign.create({
    data: {
      slug: DEFAULT_CAMPAIGN_SLUG,
      name: "Blobbie Beta Airdrop",
      description: "Earn Airdrop Points for beta contributions.",
      tasks: {
        create: AIRDROP_TASKS.map((t) => ({
          key: t.key,
          title: t.title,
          description: t.description,
          points: t.points,
          type: t.type,
          status: t.status,
          requiresAdmin: t.requiresAdmin,
          sortOrder: t.sortOrder,
        })),
      },
    },
  });
}
