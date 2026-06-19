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
    return {
      recorded: true,
      accepted: args.ticketCount,
      message: "Tickets purchased.",
      roundNumber: round.roundNumber,
    };
  }

  // DB-backed lifecycle: the engine validates the round is open, clamps to the
  // remaining capacity, records the entry, and auto-settles when full.
  const res = await addTickets(args.wallet, args.ticketCount, args.mockMode);
  return {
    recorded: res.ok,
    accepted: res.accepted,
    message: res.message,
    roundNumber: res.roundNumber,
  };
}
