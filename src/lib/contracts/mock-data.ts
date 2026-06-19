import {
  ROUND_CAPACITY,
  ROUND_DURATION_MS,
  CLOSING_SOON_THRESHOLD_MS,
  POOL_ALLOCATION,
  TICKET_USD_VALUE,
  type RoundStatusUI,
} from "../constants";
import type { RoundInfo, Winner } from "./types";

/**
 * Deterministic mock round generator. Produces consistent round state from the
 * wall clock so the UI works end-to-end without a database or live contract.
 *
 * A round closes when either 300 unique users join OR 24h pass. We model an
 * "active" round whose start is aligned to the current 24h window.
 */

const GENESIS = Date.UTC(2025, 0, 1); // round numbering anchor

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function mockWallet(seed: number): string {
  const rnd = seededRandom(seed * 7919 + 13);
  let hex = "0x";
  for (let i = 0; i < 40; i++) {
    hex += Math.floor(rnd() * 16).toString(16);
  }
  return hex;
}

export function getMockCurrentRound(now = Date.now()): RoundInfo {
  const elapsedWindows = Math.floor((now - GENESIS) / ROUND_DURATION_MS);
  const roundNumber = elapsedWindows + 1;
  const startTime = GENESIS + elapsedWindows * ROUND_DURATION_MS;
  const endTime = startTime + ROUND_DURATION_MS;

  const progress = (now - startTime) / ROUND_DURATION_MS; // 0..1
  const rnd = seededRandom(roundNumber);
  // The round fills at 300 TICKETS (1 ticket = 1 entry). Simulate tickets
  // selling through the 24h window.
  const noise = 0.85 + rnd() * 0.3;
  let totalTickets = Math.min(
    ROUND_CAPACITY,
    Math.floor(progress * ROUND_CAPACITY * noise),
  );
  totalTickets = Math.max(0, totalTickets);

  const filled = totalTickets >= ROUND_CAPACITY;
  const msRemaining = endTime - now;

  let status: RoundStatusUI = "OPEN";
  if (filled) status = "FILLED";
  else if (msRemaining <= CLOSING_SOON_THRESHOLD_MS) status = "CLOSING_SOON";

  // Unique players ≈ tickets / (1.2–1.7 tickets per wallet). Secondary metric.
  const participants = Math.max(
    totalTickets > 0 ? 1 : 0,
    Math.floor(totalTickets / (1.2 + rnd() * 0.5)),
  );
  const supplementTickets = Math.max(0, ROUND_CAPACITY - totalTickets);

  return {
    roundId: roundNumber,
    roundNumber,
    status,
    capacity: ROUND_CAPACITY,
    participants,
    totalTickets,
    supplementTickets,
    startTime,
    endTime,
    poolUsd:
      POOL_ALLOCATION.winnerPayout +
      POOL_ALLOCATION.freeDailyEntries +
      POOL_ALLOCATION.jackpot +
      POOL_ALLOCATION.burnTreasury,
    mockMode: true,
  };
}

export function getMockRoundInfo(
  roundId: number,
  now = Date.now(),
): RoundInfo | null {
  const current = getMockCurrentRound(now);
  if (roundId === current.roundNumber) return current;
  if (roundId < 1 || roundId > current.roundNumber) return null;

  const startTime = GENESIS + (roundId - 1) * ROUND_DURATION_MS;
  const endTime = startTime + ROUND_DURATION_MS;
  const rnd = seededRandom(roundId);
  // Completed rounds: real tickets sold (often below the 300 cap).
  const totalTickets = Math.min(ROUND_CAPACITY, Math.floor(150 + rnd() * 200));
  const participants = Math.max(1, Math.floor(totalTickets / (1.2 + rnd() * 0.5)));
  return {
    roundId,
    roundNumber: roundId,
    status: "COMPLETED",
    capacity: ROUND_CAPACITY,
    participants,
    totalTickets,
    supplementTickets: Math.max(0, ROUND_CAPACITY - totalTickets),
    startTime,
    endTime,
    poolUsd:
      POOL_ALLOCATION.winnerPayout +
      POOL_ALLOCATION.freeDailyEntries +
      POOL_ALLOCATION.jackpot +
      POOL_ALLOCATION.burnTreasury,
    mockMode: true,
  };
}

export function getMockWinners(roundId: number, priceUsd = 0.0025): Winner[] {
  const info = getMockRoundInfo(roundId);
  if (!info || info.status !== "COMPLETED") return [];

  // Prizes scale to the real tickets sold (supplement tickets aren't eligible).
  const scale = Math.min(1, info.totalTickets / 300);
  // Cannot award more winners than eligible tickets.
  const maxWinners = Math.min(150, info.totalTickets);

  const winners: Winner[] = [];
  const tokensFor = (usd: number) =>
    priceUsd > 0 ? (usd / priceUsd).toFixed(0) : "0";

  const push = (rank: number, tier: Winner["tier"], baseUsd: number) => {
    const usd = baseUsd * scale;
    winners.push({
      rank,
      wallet: mockWallet(roundId * 1000 + rank),
      tier,
      usdAmount: usd,
      blobbieAmount: tokensFor(usd),
      claimStatus: rank % 3 === 0 ? "UNCLAIMED" : "CLAIMED",
      txHash: rank % 3 === 0 ? null : `0x${"a".repeat(64)}`,
    });
  };

  if (maxWinners >= 1) push(1, "first", 102);
  for (let i = 2; i <= 10 && i <= maxWinners; i++) push(i, "top10", 4);
  // Sample first 20 of the 11–150 tier for display performance.
  for (let i = 11; i <= 30 && i <= maxWinners; i++) push(i, "top150", 1);
  return winners;
}

export { TICKET_USD_VALUE };
