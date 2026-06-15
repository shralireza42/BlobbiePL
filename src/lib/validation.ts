import { z } from "zod";
import { AIRDROP_TASKS, MAX_TICKETS_PER_TX } from "./constants";

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address")
  .transform((v) => v.toLowerCase());

export const hexSchema = z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid hex");

const taskKeys = AIRDROP_TASKS.map((t) => t.key) as [string, ...string[]];

export const loginNonceSchema = z.object({
  wallet: addressSchema,
});

export const loginVerifySchema = z.object({
  wallet: addressSchema,
  message: z.string().min(10).max(500),
  signature: hexSchema,
});

export const taskClaimSchema = z.object({
  taskKey: z.enum(taskKeys),
});

export const buyTicketsSchema = z.object({
  ticketCount: z
    .number()
    .int()
    .min(1)
    .max(MAX_TICKETS_PER_TX),
  roundId: z.number().int().positive().optional(),
  // Real tx hash if a wallet broadcast one. Mock mode must omit this.
  txHash: hexSchema.optional(),
});

export const claimPrizeSchema = z.object({
  roundId: z.number().int().positive(),
});

export const adminConfigSchema = z.object({
  enableMockMode: z.boolean().optional(),
  enableTicketPurchase: z.boolean().optional(),
  mockPriceUsd: z.number().positive().max(1000).optional(),
  tokenAddress: z.union([addressSchema, z.literal("")]).optional(),
  dailyDrawAddress: z.union([addressSchema, z.literal("")]).optional(),
  jackpotAddress: z.union([addressSchema, z.literal("")]).optional(),
  operationalWallet: z.union([addressSchema, z.literal("")]).optional(),
  burnAddress: z.union([addressSchema, z.literal("")]).optional(),
});

export const adminReviewSchema = z.object({
  wallet: addressSchema,
  decision: z.enum(["APPROVED", "REJECTED", "FLAGGED", "PENDING"]),
  notes: z.string().max(1000).optional(),
});

export const adminCompletionReviewSchema = z.object({
  completionId: z.string().min(1),
  approve: z.boolean(),
});

export const fraudFlagSchema = z.object({
  wallet: addressSchema,
  reason: z.enum([
    "MULTI_ACCOUNT",
    "IP_CLUSTER",
    "DEVICE_CLUSTER",
    "ABNORMAL_ACTIVITY",
    "MANUAL_FLAG",
  ]),
  details: z.string().max(1000).optional(),
});

export type LoginVerifyInput = z.infer<typeof loginVerifySchema>;
export type TaskClaimInput = z.infer<typeof taskClaimSchema>;
export type BuyTicketsInput = z.infer<typeof buyTicketsSchema>;
