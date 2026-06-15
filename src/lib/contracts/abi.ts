/** Minimal ABIs for future real-contract integration. */

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

/**
 * DailyRewardsDraw ABI — the live contract must expose these methods and
 * use VRF-compatible randomness for winner selection.
 */
export const dailyDrawAbi = [
  {
    type: "function",
    name: "getCurrentRound",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "roundId", type: "uint256" }],
  },
  {
    type: "function",
    name: "getRoundInfo",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      { name: "status", type: "uint8" },
      { name: "participants", type: "uint256" },
      { name: "totalTickets", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getUserTickets",
    stateMutability: "view",
    inputs: [
      { name: "roundId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "buyTickets",
    stateMutability: "nonpayable",
    inputs: [{ name: "ticketCount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimPrize",
    stateMutability: "nonpayable",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getRoundWinners",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      { name: "winners", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
  },
] as const;
