import { parseUnits } from "viem";
import { config } from "../config";
import { getBlobbiePrice, tokensForUsd } from "../price";
import { TICKET_USD_VALUE, MAX_TICKETS_PER_TX } from "../constants";
import type { Address, DrawProvider, RoundInfo, TxResult, Winner } from "./types";
import {
  getMockCurrentRound,
  getMockRoundInfo,
  getMockWinners,
} from "./mock-data";

const TOKEN_DECIMALS = 18;

/**
 * Mock DailyRewardsDraw provider. Returns deterministic data and SIMULATES
 * writes — it never claims a real transaction happened.
 */
export class MockDrawProvider implements DrawProvider {
  readonly isMock = true;

  async getCurrentRound(): Promise<RoundInfo> {
    return getMockCurrentRound();
  }

  async getRoundInfo(roundId: number): Promise<RoundInfo | null> {
    return getMockRoundInfo(roundId);
  }

  async getUserTickets(): Promise<number> {
    // Without a session we cannot know; UI sources this from the API/session.
    return 0;
  }

  async getRoundWinners(roundId: number): Promise<Winner[]> {
    const price = await getBlobbiePrice();
    return getMockWinners(roundId, price.usd);
  }

  async quoteTickets(ticketCount: number) {
    const safeCount = Math.max(
      0,
      Math.min(MAX_TICKETS_PER_TX, Math.floor(ticketCount)),
    );
    const price = await getBlobbiePrice();
    const usd = safeCount * TICKET_USD_VALUE;
    const tokens = tokensForUsd(usd, price.usd);
    const blobbieWei = parseUnits(tokens.toFixed(TOKEN_DECIMALS), TOKEN_DECIMALS);
    return {
      blobbieWei,
      usd,
      priceUsd: price.usd,
      isMockPrice: price.isMock,
    };
  }

  async buyTickets(ticketCount: number, _user: Address): Promise<TxResult> {
    void _user;
    if (!config.ticketPurchaseEnabled) {
      return {
        isReal: false,
        status: "failed",
        message: "Ticket purchase is currently disabled.",
      };
    }
    // Simulated only. No tx hash, no on-chain effect.
    return {
      isReal: false,
      status: "simulated",
      hash: null,
      message: `Simulated purchase of ${ticketCount} ticket(s) in Beta Mock Mode.`,
    };
  }

  async claimPrize(roundId: number, _user: Address): Promise<TxResult> {
    void _user;
    return {
      isReal: false,
      status: "simulated",
      hash: null,
      message: `Simulated prize claim for round #${roundId} in Beta Mock Mode.`,
    };
  }
}
