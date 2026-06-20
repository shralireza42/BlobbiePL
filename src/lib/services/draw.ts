import "server-only";
import { prisma, hasDatabase } from "../prisma";
import { getDrawProvider, isMockMode } from "../contracts";
import { getBlobbiePrice } from "../price";
import type { RoundInfo, Winner } from "../contracts/types";
import { getMockWinners } from "../contracts/mock-data";
import { getOrAdvanceRound, addTickets } from "./draw-engine";

/**
 * Draw read/service layer. Prefers the live/DB-backed round when a database is
 * configured, and always falls back to the deterministic mock provider so the
 * UI works end-to-end in Beta Mock Mode.
 *
 * Purchases in mock mode are tracked in a process-wide in-memory store so the
 * participant/ticket counts update immediately (no database required).
 */

type RoundEntries = Map<string, number>; // wallet -> ticketCount
const globalForDraw = globalThis as unknown as {
  mockEntries?: Map<number, RoundEntries>;
};
const mockEntries = (globalForDraw.mockEntries ??= new Map());

function addMockEntry(roundNumber: number, wallet: string, count: number) {
  const round = mockEntries.get(roundNumber) ?? new Map<string, number>();
  round.set(wallet.toLowerCase(), (round.get(wallet.toLowerCase()) ?? 0) + count);
  mockEntries.set(roundNumber, round);
}

function getMockExtra(roundNumber: number) {
  const round = mockEntries.get(roundNumber);
  if (!round) return { users: 0, tickets: 0 };
  let tickets = 0;
  for (const t of round.values()) tickets += t;
  return { users: round.size, tickets };
}

function getMockUserTickets(roundNumber: number, wallet: string) {
  return mockEntries.get(roundNumber)?.get(wallet.toLowerCase()) ?? 0;
}

export async function getCurrentRound(): Promise<RoundInfo> {
  // With a database we run the real round lifecycle (fill → draw → cooldown →
  // next). Without one we use the deterministic mock + in-memory ticket store.
  if (hasDatabase) {
    try {
      return await getOrAdvanceRound(isMockMode());
    } catch {
      // fall through to mock view if the DB is unavailable
    }
  }

  const base = await getDrawProvider().getCurrentRound();
  if (!base.mockMode) return base;

  const ex = getMockExtra(base.roundNumber);
  const totalTickets = Math.min(base.capacity, base.totalTickets + ex.tickets);
  return {
    ...base,
    participants: base.participants + ex.users,
    totalTickets,
    supplementTickets: Math.max(0, base.capacity - totalTickets),
    status: totalTickets >= base.capacity ? "FILLED" : base.status,
    purchaseOpen: base.status === "OPEN" && totalTickets < base.capacity,
  };
}

export async function getUserTicketsForCurrentRound(
  wallet: string,
): Promise<number> {
  const w = wallet.toLowerCase();
  if (!hasDatabase) {
    const round = await getDrawProvider().getCurrentRound();
    return getMockUserTickets(round.roundNumber, w);
  }
  try {
    const round = await getCurrentRound();
    const entry = await prisma.drawEntry.findFirst({
      where: { wallet: w, round: { roundNumber: round.roundNumber } },
      select: { ticketCount: true },
    });
    return entry?.ticketCount ?? 0;
  } catch {
    return 0;
  }
}

export async function getRoundWinners(roundId: number): Promise<Winner[]> {
  if (hasDatabase) {
    try {
      const round = await prisma.drawRound.findFirst({
        where: { roundNumber: roundId },
        include: { winners: { orderBy: { rank: "asc" } } },
      });
      if (round && round.winners.length > 0) {
        return round.winners.map((w) => ({
          rank: w.rank,
          wallet: w.wallet,
          tier: w.tier as Winner["tier"],
          usdAmount: w.usdAmount,
          blobbieAmount: w.blobbieAmount,
          claimStatus: w.claimStatus as Winner["claimStatus"],
          txHash: w.claimTxHash,
        }));
      }
    } catch {
      // fall through to mock
    }
  }
  const price = await getBlobbiePrice();
  return getMockWinners(roundId, price.usd);
}

export type MyWinning = {
  roundNumber: number;
  rank: number;
  usdAmount: number;
  blobbieAmount: string;
  claimStatus: "UNCLAIMED" | "CLAIMED" | "EXPIRED";
  txHash: string | null;
};

/** Prizes the connected wallet has won across rounds. */
export async function getMyWinnings(wallet: string): Promise<MyWinning[]> {
  if (!hasDatabase) return [];
  try {
    const rows = await prisma.drawWinner.findMany({
      where: { wallet: wallet.toLowerCase() },
      include: { round: { select: { roundNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((w) => ({
      roundNumber: w.round.roundNumber,
      rank: w.rank,
      usdAmount: w.usdAmount,
      blobbieAmount: w.blobbieAmount,
      claimStatus: w.claimStatus as MyWinning["claimStatus"],
      txHash: w.claimTxHash,
    }));
  } catch {
    return [];
  }
}

/** Claim a prize the wallet won (one-time, idempotent). */
export async function claimWinnings(
  wallet: string,
  roundNumber: number,
): Promise<{ ok: boolean; message: string; usdAmount?: number }> {
  if (!hasDatabase) {
    return { ok: false, message: "No on-chain winnings to claim in Beta Mock Mode." };
  }
  const lowered = wallet.toLowerCase();
  return prisma.$transaction(async (tx) => {
    const round = await tx.drawRound.findUnique({ where: { roundNumber } });
    if (!round) return { ok: false, message: "Round not found." };
    const winner = await tx.drawWinner.findFirst({
      where: { roundId: round.id, wallet: lowered },
    });
    if (!winner) return { ok: false, message: "You didn't win in this round." };
    if (winner.claimStatus === "CLAIMED") {
      return { ok: false, message: "This prize has already been claimed." };
    }
    await tx.drawWinner.update({
      where: { id: winner.id },
      data: { claimStatus: "CLAIMED", claimedAt: new Date() },
    });
    await tx.activityLog.create({
      data: {
        wallet: lowered,
        type: "prize_claim",
        message: `Claimed prize for round #${roundNumber}`,
        metadata: { usdAmount: winner.usdAmount },
      },
    });
    return {
      ok: true,
      message: `Claimed $${winner.usdAmount.toFixed(2)} in $BLOBBIE.`,
      usdAmount: winner.usdAmount,
    };
  });
}

export async function getRecentResults(limit = 3) {
  // DB lifecycle: return the most recent settled rounds (those with winners),
  // newest first — this includes a round the moment it closes.
  if (hasDatabase) {
    try {
      const rounds = await prisma.drawRound.findMany({
        where: { winners: { some: {} } },
        orderBy: { roundNumber: "desc" },
        take: limit,
        include: { winners: { orderBy: { rank: "asc" } } },
      });
      if (rounds.length > 0) {
        return rounds.map((r) => ({
          round: {
            roundId: r.roundNumber,
            roundNumber: r.roundNumber,
            status: r.status as RoundInfo["status"],
            capacity: r.capacity,
            participants: r.uniqueUsers,
            totalTickets: r.totalTickets,
            supplementTickets: r.supplementTickets,
            startTime: r.startTime.getTime(),
            endTime: r.endTime.getTime(),
            poolUsd: 300,
            mockMode: r.mockMode,
          } as RoundInfo,
          winners: r.winners.map((w) => ({
            rank: w.rank,
            wallet: w.wallet,
            tier: w.tier as Winner["tier"],
            usdAmount: w.usdAmount,
            blobbieAmount: w.blobbieAmount,
            claimStatus: w.claimStatus as Winner["claimStatus"],
            txHash: w.claimTxHash,
          })),
        }));
      }
    } catch {
      // fall through to mock
    }
  }

  const current = await getCurrentRound();
  const results: { round: RoundInfo; winners: Winner[] }[] = [];
  for (let id = current.roundNumber; id >= 1 && results.length < limit; id--) {
    const info = await getDrawProvider().getRoundInfo(id);
    if (!info) continue;
    const winners = await getRoundWinners(id);
    if (winners.length > 0) results.push({ round: info, winners });
  }
  return results;
}

/**
 * Records an off-chain ticket entry (used for mock mode + indexing). Uses a
 * transaction and enforces one row per (round, user). Never trusts client
 * points/values — USD is derived server-side from the oracle/mock price.
 */
export async function recordEntry(args: {
  wallet: string;
  ticketCount: number;
  txHash?: string | null;
  mockMode: boolean;
  maxPerUser: number;
}) {
  if (!hasDatabase) {
    // No database — track in the in-memory mock store so counts update live.
    const round = await getDrawProvider().getCurrentRound();
    const held = getMockUserTickets(round.roundNumber, args.wallet);
    const userRemaining = Math.max(0, args.maxPerUser - held);
    if (userRemaining <= 0) {
      return {
        recorded: false,
        accepted: 0,
        message: `You've reached your ${args.maxPerUser}-ticket limit for this round.`,
        roundNumber: round.roundNumber,
      };
    }
    const remaining = Math.max(0, round.capacity - round.totalTickets);
    const accepted = Math.min(args.ticketCount, userRemaining, remaining || args.ticketCount);
    addMockEntry(round.roundNumber, args.wallet, accepted);
    return {
      recorded: true,
      accepted,
      message: "Tickets purchased.",
      roundNumber: round.roundNumber,
    };
  }

  // DB-backed lifecycle: the engine validates the round is open, clamps to the
  // remaining capacity, records the entry, and auto-settles when full.
  const res = await addTickets(args.wallet, args.ticketCount, args.mockMode, args.maxPerUser);
  return {
    recorded: res.ok,
    accepted: res.accepted,
    message: res.message,
    roundNumber: res.roundNumber,
  };
}
