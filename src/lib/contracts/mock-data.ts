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
  // Simulate growing participation through the window.
  const noise = 0.85 + rnd() * 0.3;
  let participants = Math.min(
    ROUND_CAPACITY,
    Math.floor(progress * ROUND_CAPACITY * noise),
  );
  participants = Math.max(0, participants);

  const filled = participants >= ROUND_CAPACITY;
  const msRemaining = endTime - now;

  let status: RoundStatusUI = "OPEN";
  if (filled) status = "FILLED";
  else if (msRemaining <= CLOSING_SOON_THRESHOLD_MS) status = "CLOSING_SOON";

  // Average ~1.4 tickets per participant in the mock.
  const totalTickets = Math.floor(participants * (1.2 + rnd() * 0.5));
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
  const participants = Math.floor(120 + rnd() * 180);
  const totalTickets = Math.floor(participants * (1.2 + rnd() * 0.5));
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

  const winners: Winner[] = [];
  const tokensFor = (usd: number) =>
    priceUsd > 0 ? (usd / priceUsd).toFixed(0) : "0";

  // 1st place
  winners.push({
    rank: 1,
    wallet: mockWallet(roundId * 1000 + 1),
    tier: "first",
    usdAmount: 102,
    blobbieAmount: tokensFor(102),
    claimStatus: roundId % 3 === 0 ? "UNCLAIMED" : "CLAIMED",
    txHash: roundId % 3 === 0 ? null : `0x${"a".repeat(64)}`,
  });
  // 2nd-10th
  for (let i = 2; i <= 10; i++) {
    winners.push({
      rank: i,
      wallet: mockWallet(roundId * 1000 + i),
      tier: "top10",
      usdAmount: 4,
      blobbieAmount: tokensFor(4),
      claimStatus: i % 2 === 0 ? "CLAIMED" : "UNCLAIMED",
      txHash: i % 2 === 0 ? `0x${"b".repeat(64)}` : null,
    });
  }
  // 11th-150th (sample first 20 for display performance)
  for (let i = 11; i <= 30; i++) {
    winners.push({
      rank: i,
      wallet: mockWallet(roundId * 1000 + i),
      tier: "top150",
      usdAmount: 1,
      blobbieAmount: tokensFor(1),
      claimStatus: "UNCLAIMED",
      txHash: null,
    });
  }
  return winners;
}

export { TICKET_USD_VALUE };
