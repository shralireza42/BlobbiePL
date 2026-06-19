import type { RoundStatusUI } from "../constants";

export type Address = `0x${string}`;

export type RoundInfo = {
  roundId: number;
  roundNumber: number;
  status: RoundStatusUI;
  capacity: number;
  participants: number; // unique users
  totalTickets: number;
  supplementTickets: number;
  startTime: number; // epoch ms
  endTime: number; // epoch ms
  poolUsd: number;
  mockMode: boolean;
};

export type Winner = {
  rank: number;
  wallet: Address | string;
  tier: "first" | "top10" | "top150";
  usdAmount: number;
  blobbieAmount: string;
  claimStatus: "UNCLAIMED" | "CLAIMED" | "EXPIRED";
  txHash?: string | null;
};

export type TxResult = {
  /** True only for real, broadcast transactions. */
  isReal: boolean;
  hash?: string | null;
  status: "submitted" | "confirmed" | "simulated" | "failed";
  message?: string;
};

/** BEP-20 token interface (read-only on the frontend). */
export interface TokenProvider {
  getAddress(): Address | null;
  getDecimals(): Promise<number>;
  getSymbol(): Promise<string>;
  getBalance(owner: Address): Promise<bigint>;
  getAllowance(owner: Address, spender: Address): Promise<bigint>;
}

/** DailyRewardsDraw interface — mirrors the future on-chain contract. */
export interface DrawProvider {
  isMock: boolean;
  getCurrentRound(): Promise<RoundInfo>;
  getRoundInfo(roundId: number): Promise<RoundInfo | null>;
  getUserTickets(roundId: number, user: Address): Promise<number>;
  getRoundWinners(roundId: number): Promise<Winner[]>;
  /** Estimated $BLOBBIE (wei) needed for N tickets at current price. */
  quoteTickets(ticketCount: number): Promise<{
    blobbieWei: bigint;
    usd: number;
    priceUsd: number;
    isMockPrice: boolean;
  }>;
  /**
   * buyTickets / claimPrize are write paths. In mock mode they return a
   * simulated TxResult and NEVER claim a real tx happened.
   */
  buyTickets(ticketCount: number, user: Address): Promise<TxResult>;
  claimPrize(roundId: number, user: Address): Promise<TxResult>;
}
