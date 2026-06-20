import "server-only";
import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { getBlobbiePrice } from "../price";
import {
  ROUND_CAPACITY,
  ROUND_DURATION_MS,
  DRAW_COOLDOWN_MS,
  CLOSING_SOON_THRESHOLD_MS,
  PRIZE_DISTRIBUTION,
  POOL_ALLOCATION,
  DEFAULT_CAMPAIGN_SLUG,
  AIRDROP_TASKS,
} from "../constants";
import { poolScale } from "../prizes";
import type { RoundInfo } from "../contracts/types";

type Tx = Prisma.TransactionClient;

const POOL_USD =
  POOL_ALLOCATION.winnerPayout +
  POOL_ALLOCATION.freeDailyEntries +
  POOL_ALLOCATION.jackpot +
  POOL_ALLOCATION.burnTreasury;

/** Deterministic RNG seeded from a hex string (mulberry32). */
function seededRng(seedHex: string): () => number {
  let h = 1779033703 ^ seedHex.length;
  for (let i = 0; i < seedHex.length; i++) {
    h = Math.imul(h ^ seedHex.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toRoundInfo(row: {
  roundNumber: number;
  status: string;
  capacity: number;
  uniqueUsers: number;
  totalTickets: number;
  supplementTickets: number;
  startTime: Date;
  endTime: Date;
  cooldownEndsAt: Date | null;
  randomSeed: string | null;
  vrfRequestId: string | null;
  mockMode: boolean;
}): RoundInfo {
  return {
    roundId: row.roundNumber,
    roundNumber: row.roundNumber,
    status: row.status as RoundInfo["status"],
    capacity: row.capacity,
    participants: row.uniqueUsers,
    totalTickets: row.totalTickets,
    supplementTickets: row.supplementTickets,
    startTime: row.startTime.getTime(),
    endTime: row.endTime.getTime(),
    poolUsd: POOL_USD,
    mockMode: row.mockMode,
    cooldownEndsAt: row.cooldownEndsAt?.getTime() ?? null,
    purchaseOpen: row.status === "OPEN",
    randomSeed: row.randomSeed,
    vrfRequestId: row.vrfRequestId,
  };
}

async function createRound(tx: Tx, roundNumber: number, mock: boolean) {
  const now = new Date();
  return tx.drawRound.create({
    data: {
      roundNumber,
      status: "OPEN",
      capacity: ROUND_CAPACITY,
      startTime: now,
      endTime: new Date(now.getTime() + ROUND_DURATION_MS),
      mockMode: mock,
    },
  });
}

/**
 * Settle a round: pick winners with a verifiable random seed (mock random here;
 * Chainlink VRF on-chain when live), scale prizes to real tickets, supplement
 * the rest (not eligible), and start the 3-minute cooldown.
 */
async function settleRound(tx: Tx, roundId: string, mock: boolean) {
  const round = await tx.drawRound.findUnique({ where: { id: roundId } });
  if (!round || round.status !== "OPEN") return;

  const entries = await tx.drawEntry.findMany({
    where: { roundId },
    select: { wallet: true, ticketCount: true },
  });

  const realTickets = Math.min(
    ROUND_CAPACITY,
    entries.reduce((s, e) => s + e.ticketCount, 0),
  );
  const scale = poolScale(realTickets);
  const price = await getBlobbiePrice();
  const tokensFor = (usd: number) =>
    price.usd > 0 ? (usd / price.usd).toFixed(0) : "0";

  // Verifiable randomness. In mock mode this is a random seed; on-chain this is
  // the Chainlink VRF output / request id.
  const seed = "0x" + randomBytes(32).toString("hex");
  const vrfRequestId = mock ? `vrf-mock-${round.roundNumber}` : null;
  const rng = seededRng(seed);

  // Weighted ticket pool (each ticket is an entry), then seeded shuffle.
  const pool: string[] = [];
  for (const e of entries) {
    for (let i = 0; i < e.ticketCount && pool.length < ROUND_CAPACITY; i++) {
      pool.push(e.wallet);
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Pick distinct wallets in shuffled order (one prize per wallet).
  const winners: string[] = [];
  const seen = new Set<string>();
  for (const w of pool) {
    if (seen.has(w)) continue;
    seen.add(w);
    winners.push(w);
    if (winners.length >= PRIZE_TOTAL) break;
  }

  const now = new Date();
  await tx.drawRound.update({
    where: { id: roundId },
    data: {
      status: "AWAITING_DRAW",
      drawnAt: now,
      cooldownEndsAt: new Date(now.getTime() + DRAW_COOLDOWN_MS),
      randomSeed: seed,
      vrfRequestId,
      supplementTickets: Math.max(0, ROUND_CAPACITY - realTickets),
      totalTickets: realTickets,
    },
  });

  // Create winner rows (scaled). Tiers: 1st, 2-10, 11-150.
  for (let rank = 1; rank <= winners.length; rank++) {
    const wallet = winners[rank - 1];
    let tier: "first" | "top10" | "top150";
    let baseUsd: number;
    if (rank === 1) {
      tier = "first";
      baseUsd = PRIZE_DISTRIBUTION.first.usdEach;
    } else if (rank <= 10) {
      tier = "top10";
      baseUsd = PRIZE_DISTRIBUTION.top10.usdEach;
    } else {
      tier = "top150";
      baseUsd = PRIZE_DISTRIBUTION.top150.usdEach;
    }
    const usd = baseUsd * scale;
    await tx.drawWinner.create({
      data: {
        roundId,
        wallet,
        rank,
        tier,
        usdAmount: usd,
        blobbieAmount: tokensFor(usd),
        claimStatus: "UNCLAIMED",
      },
    });
  }

  // Award the one-time "Daily Draw Top Winner" airdrop task to 1st place.
  if (winners.length > 0) {
    await grantTopWinner(tx, winners[0]);
  }

  await tx.activityLog.create({
    data: {
      wallet: null,
      type: "draw_settled",
      message: `Round #${round.roundNumber} drawn — ${winners.length} winner(s), seed ${seed.slice(0, 10)}…`,
      metadata: { seed, vrfRequestId, realTickets },
    },
  });
}

const TOP_WINNER_TASK = AIRDROP_TASKS.find((t) => t.key === "top_winner");

/**
 * Grant the one-time top-winner airdrop bonus (10,000 pts) to a round's 1st
 * place wallet. Idempotent — a wallet receives it only once, ever. Safe no-op
 * if the airdrop campaign hasn't been initialized yet.
 */
async function grantTopWinner(tx: Tx, wallet: string) {
  if (!TOP_WINNER_TASK) return;
  const lowered = wallet.toLowerCase();

  const campaign = await tx.airdropCampaign.findUnique({
    where: { slug: DEFAULT_CAMPAIGN_SLUG },
  });
  if (!campaign) return;

  // Ensure the task row exists (campaigns seeded before this task was added).
  const task = await tx.airdropTask.upsert({
    where: { campaignId_key: { campaignId: campaign.id, key: TOP_WINNER_TASK.key } },
    update: {},
    create: {
      campaignId: campaign.id,
      key: TOP_WINNER_TASK.key,
      title: TOP_WINNER_TASK.title,
      description: TOP_WINNER_TASK.description,
      points: TOP_WINNER_TASK.points,
      type: TOP_WINNER_TASK.type,
      status: TOP_WINNER_TASK.status,
      requiresAdmin: TOP_WINNER_TASK.requiresAdmin,
      sortOrder: TOP_WINNER_TASK.sortOrder,
    },
  });

  const user = await tx.user.upsert({
    where: { wallet: lowered },
    update: {},
    create: { wallet: lowered },
  });

  const existing = await tx.airdropCompletion.findUnique({
    where: {
      taskId_userId_dayBucket: { taskId: task.id, userId: user.id, dayBucket: "" },
    },
  });
  if (existing?.approved) return; // already a top winner before — once only

  const airdropUser = await tx.airdropUser.upsert({
    where: { campaignId_wallet: { campaignId: campaign.id, wallet: lowered } },
    update: {},
    create: { userId: user.id, campaignId: campaign.id, wallet: lowered },
  });

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
        dayBucket: "",
        approved: true,
      },
    });
  }

  const newTotal = airdropUser.totalPoints + task.points;
  await tx.airdropUser.update({
    where: { id: airdropUser.id },
    data: { totalPoints: newTotal },
  });
  await tx.airdropPointsLedger.create({
    data: {
      campaignId: campaign.id,
      userId: user.id,
      wallet: lowered,
      delta: task.points,
      balanceAfter: newTotal,
      reason: "TASK_COMPLETION",
      refType: "top_winner",
      refId: task.id,
    },
  });
  await tx.activityLog.create({
    data: {
      userId: user.id,
      wallet: lowered,
      type: "airdrop_top_winner",
      message: `Daily Draw top-winner bonus (+${task.points} pts)`,
    },
  });
}

const PRIZE_TOTAL =
  PRIZE_DISTRIBUTION.first.winners +
  PRIZE_DISTRIBUTION.top10.winners +
  PRIZE_DISTRIBUTION.top150.winners;

/**
 * Return the live round, advancing the lifecycle as needed:
 * OPEN → (300 tickets or 24h) → settle → AWAITING_DRAW (3-min cooldown) → next.
 */
export async function getOrAdvanceRound(mock: boolean): Promise<RoundInfo> {
  const row = await prisma.$transaction(async (tx) => {
    let latest = await tx.drawRound.findFirst({ orderBy: { roundNumber: "desc" } });
    if (!latest) {
      return createRound(tx, 1, mock);
    }

    const now = Date.now();

    if (latest.status === "OPEN") {
      const filled = latest.totalTickets >= latest.capacity;
      const expired = now >= latest.endTime.getTime();
      if (filled || expired) {
        await settleRound(tx, latest.id, mock);
        return tx.drawRound.findUniqueOrThrow({ where: { id: latest.id } });
      }
      // Reflect "closing soon" near the deadline.
      const closingSoon =
        latest.endTime.getTime() - now <= CLOSING_SOON_THRESHOLD_MS;
      if (closingSoon && latest.status === "OPEN") {
        latest = await tx.drawRound.update({
          where: { id: latest.id },
          data: { status: "CLOSING_SOON" },
        });
      }
      return latest;
    }

    if (latest.status === "CLOSING_SOON") {
      const filled = latest.totalTickets >= latest.capacity;
      const expired = now >= latest.endTime.getTime();
      if (filled || expired) {
        // settleRound only acts on OPEN; flip back to OPEN then settle.
        await tx.drawRound.update({ where: { id: latest.id }, data: { status: "OPEN" } });
        await settleRound(tx, latest.id, mock);
        return tx.drawRound.findUniqueOrThrow({ where: { id: latest.id } });
      }
      return latest;
    }

    if (latest.status === "AWAITING_DRAW") {
      const cooldownOver =
        !latest.cooldownEndsAt || now >= latest.cooldownEndsAt.getTime();
      if (cooldownOver) {
        await tx.drawRound.update({
          where: { id: latest.id },
          data: { status: "COMPLETED" },
        });
        return createRound(tx, latest.roundNumber + 1, mock);
      }
      return latest;
    }

    // COMPLETED → open the next round.
    return createRound(tx, latest.roundNumber + 1, mock);
  });

  return toRoundInfo(row);
}

/** Manual settle (admin RUN_DRAW): force-close the current open round now. */
export async function forceSettleCurrent(mock: boolean): Promise<{ ok: boolean; message: string }> {
  return prisma.$transaction(async (tx) => {
    const latest = await tx.drawRound.findFirst({ orderBy: { roundNumber: "desc" } });
    if (!latest) return { ok: false, message: "No active round." };
    if (latest.status !== "OPEN" && latest.status !== "CLOSING_SOON") {
      return { ok: false, message: "Round is not open." };
    }
    await tx.drawRound.update({ where: { id: latest.id }, data: { status: "OPEN" } });
    await settleRound(tx, latest.id, mock);
    return { ok: true, message: `Round #${latest.roundNumber} settled.` };
  });
}

/** Add tickets to the current OPEN round; returns the updated round + result. */
export async function addTickets(
  wallet: string,
  count: number,
  mock: boolean,
  maxPerUser: number,
): Promise<{ ok: boolean; message: string; accepted: number; roundNumber?: number }> {
  const lowered = wallet.toLowerCase();
  return prisma.$transaction(async (tx) => {
    const round = await tx.drawRound.findFirst({ orderBy: { roundNumber: "desc" } });
    if (!round || (round.status !== "OPEN" && round.status !== "CLOSING_SOON")) {
      return { ok: false, message: "The draw is closed. Please wait for the next round.", accepted: 0 };
    }
    const remaining = round.capacity - round.totalTickets;
    if (remaining <= 0) {
      return { ok: false, message: "This round is full.", accepted: 0 };
    }

    const user = await tx.user.upsert({
      where: { wallet: lowered },
      update: { lastSeenAt: new Date() },
      create: { wallet: lowered },
    });

    const existing = await tx.drawEntry.findUnique({
      where: { roundId_userId: { roundId: round.id, userId: user.id } },
    });

    // Enforce the per-user round cap (e.g. 50 tickets; 300 for owners).
    const userHeld = existing?.ticketCount ?? 0;
    const userRemaining = Math.max(0, maxPerUser - userHeld);
    if (userRemaining <= 0) {
      return {
        ok: false,
        message: `You've reached your ${maxPerUser}-ticket limit for this round.`,
        accepted: 0,
      };
    }

    const accepted = Math.min(count, remaining, userRemaining);
    const price = await getBlobbiePrice();
    const usdValue = accepted * 1;
    const blobbieSpent = price.usd > 0 ? Math.round(usdValue / price.usd) : 0;
    if (existing) {
      await tx.drawEntry.update({
        where: { id: existing.id },
        data: {
          ticketCount: existing.ticketCount + accepted,
          usdValue: existing.usdValue + usdValue,
          blobbieSpent: String(Number(existing.blobbieSpent) + blobbieSpent),
        },
      });
    } else {
      await tx.drawEntry.create({
        data: {
          roundId: round.id,
          userId: user.id,
          wallet: lowered,
          ticketCount: accepted,
          usdValue,
          blobbieSpent: String(blobbieSpent),
          mockMode: mock,
        },
      });
      await tx.drawRound.update({
        where: { id: round.id },
        data: { uniqueUsers: { increment: 1 } },
      });
    }

    const updated = await tx.drawRound.update({
      where: { id: round.id },
      data: { totalTickets: { increment: accepted } },
    });

    await tx.activityLog.create({
      data: {
        userId: user.id,
        wallet: lowered,
        type: "draw_entry",
        message: `Bought ${accepted} ticket(s) in round #${round.roundNumber}`,
        metadata: { mockMode: mock },
      },
    });

    // Auto-settle the instant the round fills.
    if (updated.totalTickets >= updated.capacity) {
      await settleRound(tx, round.id, mock);
    }

    return {
      ok: true,
      message: "Tickets purchased.",
      accepted,
      roundNumber: round.roundNumber,
    };
  });
}
