import "server-only";
import { prisma, hasDatabase } from "../prisma";
import { getDrawProvider } from "../contracts";
import { getBlobbiePrice } from "../price";
import type { RoundInfo, Winner } from "../contracts/types";
import { getMockWinners } from "../contracts/mock-data";

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
  const base = await getDrawProvider().getCurrentRound();
  // Real on-chain rounds are authoritative as-is.
  if (!base.mockMode) return base;

  let extraUsers = 0;
  let extraTickets = 0;
  if (hasDatabase) {
    try {
      const row = await prisma.drawRound.findUnique({
        where: { roundNumber: base.roundNumber },
        select: { uniqueUsers: true, totalTickets: true },
      });
      if (row) {
        extraUsers = row.uniqueUsers;
        extraTickets = row.totalTickets;
      }
    } catch {
      /* ignore */
    }
  } else {
    const ex = getMockExtra(base.roundNumber);
    extraUsers = ex.users;
    extraTickets = ex.tickets;
  }

  const participants = Math.min(base.capacity, base.participants + extraUsers);
  const totalTickets = base.totalTickets + extraTickets;
  return {
    ...base,
    participants,
    totalTickets,
    supplementTickets: Math.max(0, base.capacity - totalTickets),
    status: participants >= base.capacity ? "FILLED" : base.status,
  };
}

export async function getUserTicketsForCurrentRound(
  wallet: string,
): Promise<number> {
  const round = await getDrawProvider().getCurrentRound();
  const w = wallet.toLowerCase();
  if (!hasDatabase) return getMockUserTickets(round.roundNumber, w);
  try {
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

export async function getRecentResults(limit = 3) {
  const current = await getCurrentRound();
  const results: { round: RoundInfo; winners: Winner[] }[] = [];
  for (let id = current.roundNumber - 1; id >= 1 && results.length < limit; id--) {
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
}) {
  if (!hasDatabase) {
    // No database — track in the in-memory mock store so counts update live.
    const round = await getDrawProvider().getCurrentRound();
    addMockEntry(round.roundNumber, args.wallet, args.ticketCount);
    return { recorded: true as const, mock: true as const, roundNumber: round.roundNumber };
  }
  const wallet = args.wallet.toLowerCase();
  const price = await getBlobbiePrice();
  const usdValue = args.ticketCount * 1; // 1 ticket = $1

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { wallet },
      update: { lastSeenAt: new Date() },
      create: { wallet },
    });

    const round = await ensureCurrentRound(tx);

    const existing = await tx.drawEntry.findUnique({
      where: { roundId_userId: { roundId: round.id, userId: user.id } },
    });

    const blobbieSpent = price.usd > 0
      ? Math.round((usdValue / price.usd))
      : 0;

    if (existing) {
      await tx.drawEntry.update({
        where: { id: existing.id },
        data: {
          ticketCount: existing.ticketCount + args.ticketCount,
          usdValue: existing.usdValue + usdValue,
          blobbieSpent: String(Number(existing.blobbieSpent) + blobbieSpent),
          txHash: args.txHash ?? existing.txHash,
        },
      });
    } else {
      await tx.drawEntry.create({
        data: {
          roundId: round.id,
          userId: user.id,
          wallet,
          ticketCount: args.ticketCount,
          usdValue,
          blobbieSpent: String(blobbieSpent),
          txHash: args.txHash ?? null,
          mockMode: args.mockMode,
        },
      });
      await tx.drawRound.update({
        where: { id: round.id },
        data: { uniqueUsers: { increment: 1 } },
      });
    }

    await tx.drawRound.update({
      where: { id: round.id },
      data: { totalTickets: { increment: args.ticketCount } },
    });

    await tx.activityLog.create({
      data: {
        userId: user.id,
        wallet,
        type: "draw_entry",
        message: `Bought ${args.ticketCount} ticket(s) in round #${round.roundNumber}`,
        metadata: { mockMode: args.mockMode, txHash: args.txHash ?? null },
      },
    });

    return { recorded: true as const, roundNumber: round.roundNumber };
  });
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function ensureCurrentRound(tx: Tx) {
  const info = await getDrawProvider().getCurrentRound();
  const existing = await tx.drawRound.findUnique({
    where: { roundNumber: info.roundNumber },
  });
  if (existing) return existing;
  return tx.drawRound.create({
    data: {
      roundNumber: info.roundNumber,
      capacity: info.capacity,
      startTime: new Date(info.startTime),
      endTime: new Date(info.endTime),
      mockMode: info.mockMode,
    },
  });
}
