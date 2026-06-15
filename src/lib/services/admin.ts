import "server-only";
import { prisma, hasDatabase } from "../prisma";
import { getOrCreateCampaign } from "./airdrop";

export async function getAdminOverview() {
  if (!hasDatabase) {
    return {
      hasDatabase: false,
      counts: { users: 0, entries: 0, airdropUsers: 0, fraudFlags: 0, pendingCompletions: 0 },
      users: [],
      airdropUsers: [],
      drawActivity: [],
      fraudFlags: [],
      pendingCompletions: [],
      appConfig: {},
    };
  }

  const campaign = await getOrCreateCampaign();

  const [
    usersCount,
    entriesCount,
    airdropUsersCount,
    fraudCount,
    pendingCount,
    users,
    airdropUsers,
    drawActivity,
    fraudFlags,
    pendingCompletions,
    appConfigRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.drawEntry.count(),
    prisma.airdropUser.count({ where: { campaignId: campaign.id } }),
    prisma.fraudFlag.count({ where: { resolved: false } }),
    prisma.airdropCompletion.count({ where: { approved: false } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { wallet: true, createdAt: true, lastSeenAt: true, ipHash: true },
    }),
    prisma.airdropUser.findMany({
      where: { campaignId: campaign.id },
      orderBy: { totalPoints: "desc" },
      take: 50,
      select: {
        wallet: true,
        totalPoints: true,
        eligibility: true,
        createdAt: true,
      },
    }),
    prisma.drawEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        wallet: true,
        ticketCount: true,
        usdValue: true,
        mockMode: true,
        txHash: true,
        createdAt: true,
      },
    }),
    prisma.fraudFlag.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, wallet: true, reason: true, details: true, resolved: true, createdAt: true },
    }),
    prisma.airdropCompletion.findMany({
      where: { approved: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { task: { select: { title: true, points: true, key: true } } },
    }),
    prisma.appConfig.findMany(),
  ]);

  const appConfig: Record<string, string> = {};
  for (const row of appConfigRows) appConfig[row.key] = row.value;

  return {
    hasDatabase: true,
    counts: {
      users: usersCount,
      entries: entriesCount,
      airdropUsers: airdropUsersCount,
      fraudFlags: fraudCount,
      pendingCompletions: pendingCount,
    },
    users,
    airdropUsers,
    drawActivity,
    fraudFlags,
    pendingCompletions,
    appConfig,
  };
}

export async function setAppConfig(
  entries: Record<string, string | number | boolean | undefined>,
  adminWallet: string,
) {
  if (!hasDatabase) throw new Error("NO_DB");
  const ops = Object.entries(entries)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) =>
      prisma.appConfig.upsert({
        where: { key },
        update: { value: String(value), updatedBy: adminWallet },
        create: { key, value: String(value), updatedBy: adminWallet },
      }),
    );
  await prisma.$transaction([
    ...ops,
    prisma.adminAuditLog.create({
      data: {
        adminWallet,
        action: "update_config",
        metadata: entries as object,
      },
    }),
  ]);
}

export async function reviewAirdropUser(
  args: { wallet: string; decision: "APPROVED" | "REJECTED" | "FLAGGED" | "PENDING"; notes?: string },
  adminWallet: string,
) {
  if (!hasDatabase) throw new Error("NO_DB");
  const campaign = await getOrCreateCampaign();
  const eligibilityMap = {
    APPROVED: "APPROVED",
    REJECTED: "ELIGIBLE",
    FLAGGED: "FLAGGED",
    PENDING: "PENDING_REVIEW",
  } as const;

  const airdropUser = await prisma.airdropUser.findUnique({
    where: { campaignId_wallet: { campaignId: campaign.id, wallet: args.wallet } },
  });
  if (!airdropUser) throw new Error("Airdrop user not found");

  await prisma.$transaction([
    prisma.airdropUser.update({
      where: { id: airdropUser.id },
      data: { eligibility: eligibilityMap[args.decision], reviewNotes: args.notes },
    }),
    prisma.airdropReview.create({
      data: {
        airdropUserId: airdropUser.id,
        wallet: args.wallet,
        decision: args.decision,
        notes: args.notes,
        reviewedBy: adminWallet,
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminWallet,
        action: "review_airdrop_user",
        target: args.wallet,
        metadata: { decision: args.decision },
      },
    }),
  ]);
}

export async function reviewCompletion(
  args: { completionId: string; approve: boolean },
  adminWallet: string,
) {
  if (!hasDatabase) throw new Error("NO_DB");

  return prisma.$transaction(async (tx) => {
    const completion = await tx.airdropCompletion.findUnique({
      where: { id: args.completionId },
      include: { task: true },
    });
    if (!completion) throw new Error("Completion not found");

    if (!args.approve) {
      await tx.airdropCompletion.delete({ where: { id: completion.id } });
      await tx.adminAuditLog.create({
        data: {
          adminWallet,
          action: "reject_completion",
          target: completion.wallet,
          metadata: { taskKey: completion.task.key },
        },
      });
      return { approved: false };
    }

    const airdropUser = await tx.airdropUser.findUnique({
      where: {
        campaignId_wallet: {
          campaignId: completion.campaignId,
          wallet: completion.wallet,
        },
      },
    });
    if (!airdropUser) throw new Error("Airdrop user not found");

    const newTotal = airdropUser.totalPoints + completion.task.points;

    await tx.airdropCompletion.update({
      where: { id: completion.id },
      data: { approved: true, pointsAwarded: completion.task.points },
    });
    await tx.airdropUser.update({
      where: { id: airdropUser.id },
      data: {
        totalPoints: newTotal,
        eligibility: airdropUser.eligibility === "PENDING_REVIEW" ? "ELIGIBLE" : airdropUser.eligibility,
      },
    });
    await tx.airdropPointsLedger.create({
      data: {
        campaignId: completion.campaignId,
        userId: completion.userId,
        wallet: completion.wallet,
        delta: completion.task.points,
        balanceAfter: newTotal,
        reason: "TASK_COMPLETION",
        refType: "completion",
        refId: completion.id,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        adminWallet,
        action: "approve_completion",
        target: completion.wallet,
        metadata: { taskKey: completion.task.key, points: completion.task.points },
      },
    });
    return { approved: true, points: completion.task.points };
  });
}

export async function flagWallet(
  args: { wallet: string; reason: string; details?: string },
  adminWallet: string,
) {
  if (!hasDatabase) throw new Error("NO_DB");
  const user = await prisma.user.findUnique({ where: { wallet: args.wallet } });
  if (!user) throw new Error("User not found");
  const campaign = await getOrCreateCampaign();

  await prisma.$transaction([
    prisma.fraudFlag.create({
      data: {
        userId: user.id,
        wallet: args.wallet,
        reason: args.reason as never,
        details: args.details,
        flaggedBy: adminWallet,
      },
    }),
    prisma.airdropUser.updateMany({
      where: { campaignId: campaign.id, wallet: args.wallet },
      data: { eligibility: "FLAGGED" },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminWallet,
        action: "flag_wallet",
        target: args.wallet,
        metadata: { reason: args.reason },
      },
    }),
  ]);
}

export async function exportCsv(kind: "users" | "airdrop" | "draw"): Promise<string> {
  if (!hasDatabase) return "";
  if (kind === "users") {
    const rows = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { wallet: true, createdAt: true, lastSeenAt: true },
    });
    return toCsv(["wallet", "createdAt", "lastSeenAt"], rows.map((r) => [r.wallet, r.createdAt.toISOString(), r.lastSeenAt.toISOString()]));
  }
  if (kind === "airdrop") {
    const campaign = await getOrCreateCampaign();
    const rows = await prisma.airdropUser.findMany({
      where: { campaignId: campaign.id },
      orderBy: { totalPoints: "desc" },
      select: { wallet: true, totalPoints: true, eligibility: true, createdAt: true },
    });
    return toCsv(
      ["wallet", "totalPoints", "eligibility", "createdAt"],
      rows.map((r) => [r.wallet, String(r.totalPoints), r.eligibility, r.createdAt.toISOString()]),
    );
  }
  const rows = await prisma.drawEntry.findMany({
    orderBy: { createdAt: "desc" },
    select: { wallet: true, ticketCount: true, usdValue: true, mockMode: true, txHash: true, createdAt: true },
  });
  return toCsv(
    ["wallet", "ticketCount", "usdValue", "mockMode", "txHash", "createdAt"],
    rows.map((r) => [r.wallet, String(r.ticketCount), String(r.usdValue), String(r.mockMode), r.txHash ?? "", r.createdAt.toISOString()]),
  );
}

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}
