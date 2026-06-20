/**
 * Prize + odds math for the Daily Rewards Draw.
 *
 * Core rule: 1 ticket = $1 and 1 entry. A round fills at 300 TICKETS (not 300
 * users — a single wallet may hold many tickets/entries). When the round closes
 * with fewer than 300 real tickets, the operational wallet supplements the rest
 * so the pool is always a 300-ticket round, BUT supplementary tickets are never
 * eligible to win and the prize amounts scale down to the real revenue.
 *
 *   scale = realTickets / 300
 *
 * So every prize tier pays `tierUsd * scale`. With a full 300 real tickets the
 * scale is 1 (full prizes); with 100 real tickets the scale is 1/3, etc.
 */

import {
  PRIZE_DISTRIBUTION,
  POOL_ALLOCATION,
  ROUND_CAPACITY,
  TOTAL_WINNERS,
} from "./constants";

export function poolScale(realTickets: number): number {
  if (realTickets <= 0) return 0;
  return Math.min(1, realTickets / ROUND_CAPACITY);
}

/** A prize tier amount scaled to the real tickets sold. */
export function scaledPrize(tierUsd: number, realTickets: number): number {
  return tierUsd * poolScale(realTickets);
}

/** Number of prize slots actually awarded (cannot exceed eligible tickets). */
export function awardedWinners(realTickets: number): number {
  return Math.min(TOTAL_WINNERS, Math.max(0, realTickets));
}

/**
 * Probability that a given wallet wins at least one prize, given its tickets,
 * the eligible ticket pool, and the number of prize slots. Uses the
 * complementary hypergeometric approximation 1 - C(N-k, W)/C(N, W).
 */
export function winChancePct(
  userTickets: number,
  realTickets: number,
): number {
  if (userTickets <= 0 || realTickets <= 0) return 0;
  const N = realTickets;
  const k = Math.min(userTickets, N);
  const W = awardedWinners(N);
  if (W >= N) return 100;
  // P(no win) = product_{i=0}^{W-1} (N-k-i)/(N-i)
  let pNoWin = 1;
  for (let i = 0; i < W; i++) {
    const num = N - k - i;
    if (num <= 0) {
      pNoWin = 0;
      break;
    }
    pNoWin *= num / (N - i);
  }
  return Math.min(100, Math.max(0, (1 - pNoWin) * 100));
}

/**
 * Expected winnings for a wallet (USD). Because the pool scales with real
 * tickets, expected value is simply userTickets * (winnerPayout / 300),
 * independent of how many others join.
 */
export function expectedWinningsUsd(userTickets: number): number {
  return userTickets * (POOL_ALLOCATION.winnerPayout / ROUND_CAPACITY);
}

/** Top prize (1st place) a wallet could win at the current scale. */
export function topPrizeUsd(realTickets: number): number {
  return scaledPrize(PRIZE_DISTRIBUTION.first.usdEach, realTickets);
}

/** Chance a wallet wins the single TOP prize (1st place): tickets / pool. */
export function topWinnerChancePct(
  userTickets: number,
  realTickets: number,
): number {
  if (userTickets <= 0 || realTickets <= 0) return 0;
  return Math.min(100, (Math.min(userTickets, realTickets) / realTickets) * 100);
}

export type RoundOdds = {
  ticketsSold: number; // real tickets (eligible)
  capacity: number; // 300
  supplementTickets: number; // operational-wallet fill (not eligible)
  scalePct: number; // 0..100
  userTickets: number;
  winChancePct: number;
  topWinnerPct: number; // chance to be the #1 (top) winner
  expectedUsd: number;
  topPrizeUsd: number;
  scaledWinnerPayoutUsd: number;
};

export function computeOdds(
  realTickets: number,
  userTickets: number,
): RoundOdds {
  const scale = poolScale(realTickets);
  return {
    ticketsSold: realTickets,
    capacity: ROUND_CAPACITY,
    supplementTickets: Math.max(0, ROUND_CAPACITY - realTickets),
    scalePct: scale * 100,
    userTickets,
    winChancePct: winChancePct(userTickets, realTickets),
    topWinnerPct: topWinnerChancePct(userTickets, realTickets),
    expectedUsd: expectedWinningsUsd(userTickets),
    topPrizeUsd: topPrizeUsd(realTickets),
    scaledWinnerPayoutUsd: POOL_ALLOCATION.winnerPayout * scale,
  };
}
