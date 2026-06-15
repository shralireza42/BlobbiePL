import { createPublicClient, http, parseUnits } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { config } from "../config";
import { getBlobbiePrice, tokensForUsd } from "../price";
import { TICKET_USD_VALUE, MAX_TICKETS_PER_TX } from "../constants";
import { dailyDrawAbi } from "./abi";
import type { Address, DrawProvider, RoundInfo, TxResult, Winner } from "./types";

const TOKEN_DECIMALS = 18;

const STATUS_MAP: RoundInfo["status"][] = [
  "OPEN",
  "CLOSING_SOON",
  "FILLED",
  "AWAITING_DRAW",
  "COMPLETED",
];

/**
 * Real on-chain DailyRewardsDraw provider (read paths implemented; write paths
 * must be executed via the connected wallet client in the UI layer).
 *
 * This is intentionally a thin scaffold: it is only selected when the contract
 * address is configured AND mock mode is disabled. Until the contract is
 * deployed + audited, the factory keeps the app in MockDrawProvider.
 */
export class RealDrawProvider implements DrawProvider {
  readonly isMock = false;
  private client = createPublicClient({
    chain: config.chainId === 56 ? bsc : bscTestnet,
    transport: http(),
  });

  private get address(): Address {
    if (!config.addresses.dailyDraw) {
      throw new Error("Daily Draw contract address not configured");
    }
    return config.addresses.dailyDraw;
  }

  async getCurrentRound(): Promise<RoundInfo> {
    const roundId = (await this.client.readContract({
      address: this.address,
      abi: dailyDrawAbi,
      functionName: "getCurrentRound",
    })) as bigint;
    const info = await this.getRoundInfo(Number(roundId));
    if (!info) throw new Error("Round not found");
    return info;
  }

  async getRoundInfo(roundId: number): Promise<RoundInfo | null> {
    const res = (await this.client.readContract({
      address: this.address,
      abi: dailyDrawAbi,
      functionName: "getRoundInfo",
      args: [BigInt(roundId)],
    })) as readonly [number, bigint, bigint, bigint, bigint];
    const [status, participants, totalTickets, startTime, endTime] = res;
    return {
      roundId,
      roundNumber: roundId,
      status: STATUS_MAP[status] ?? "OPEN",
      capacity: 300,
      participants: Number(participants),
      totalTickets: Number(totalTickets),
      supplementTickets: Math.max(0, 300 - Number(totalTickets)),
      startTime: Number(startTime) * 1000,
      endTime: Number(endTime) * 1000,
      poolUsd: 300,
      mockMode: false,
    };
  }

  async getUserTickets(roundId: number, user: Address): Promise<number> {
    const res = (await this.client.readContract({
      address: this.address,
      abi: dailyDrawAbi,
      functionName: "getUserTickets",
      args: [BigInt(roundId), user],
    })) as bigint;
    return Number(res);
  }

  async getRoundWinners(roundId: number): Promise<Winner[]> {
    const res = (await this.client.readContract({
      address: this.address,
      abi: dailyDrawAbi,
      functionName: "getRoundWinners",
      args: [BigInt(roundId)],
    })) as readonly [readonly Address[], readonly bigint[]];
    const [wallets, amounts] = res;
    const price = await getBlobbiePrice();
    return wallets.map((wallet, i) => {
      const blobbieAmount = amounts[i]?.toString() ?? "0";
      const usdAmount = price.usd * Number(blobbieAmount) / 10 ** TOKEN_DECIMALS;
      const rank = i + 1;
      return {
        rank,
        wallet,
        tier: rank === 1 ? "first" : rank <= 10 ? "top10" : "top150",
        usdAmount,
        blobbieAmount,
        claimStatus: "UNCLAIMED",
        txHash: null,
      };
    });
  }

  async quoteTickets(ticketCount: number) {
    const safeCount = Math.max(
      0,
      Math.min(MAX_TICKETS_PER_TX, Math.floor(ticketCount)),
    );
    const price = await getBlobbiePrice();
    const usd = safeCount * TICKET_USD_VALUE;
    const tokens = tokensForUsd(usd, price.usd);
    return {
      blobbieWei: parseUnits(tokens.toFixed(TOKEN_DECIMALS), TOKEN_DECIMALS),
      usd,
      priceUsd: price.usd,
      isMockPrice: price.isMock,
    };
  }

  async buyTickets(): Promise<TxResult> {
    // Writes must be sent from the connected wallet (client side) using
    // wagmi's writeContract against dailyDrawAbi.buyTickets. Server-side we
    // do not hold keys, so we return a clear non-success state.
    return {
      isReal: true,
      status: "failed",
      message:
        "buyTickets must be sent from the connected wallet. Wire wagmi writeContract in the client.",
    };
  }

  async claimPrize(): Promise<TxResult> {
    return {
      isReal: true,
      status: "failed",
      message:
        "claimPrize must be sent from the connected wallet. Wire wagmi writeContract in the client.",
    };
  }
}
