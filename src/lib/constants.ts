/**
 * Shared constants for the Daily Rewards Draw and Airdrop Hub.
 * UI language rule: always "Daily Rewards Draw" — never "lottery".
 */

export const ROUND_CAPACITY = 300;
export const ROUND_DURATION_MS = 24 * 60 * 60 * 1000;
export const CLOSING_SOON_THRESHOLD_MS = 60 * 60 * 1000; // last hour
/** Cooldown between a round closing (drawing winners) and the next round. */
export const DRAW_COOLDOWN_MS = 3 * 60 * 1000;

/** 1 Ticket = $1 USD equivalent in $BLOBBIE. */
export const TICKET_USD_VALUE = 1;
export const MAX_TICKETS_PER_TX = 300;
/** Per-round per-user ticket cap. Owners can buy the whole round (300). */
export const MAX_TICKETS_PER_USER = 50;
export const MAX_TICKETS_PER_OWNER = ROUND_CAPACITY;

/** Referral rewards (points) for the referrer and the referred friend. */
export const REFERRAL_POINTS = { referrer: 100, referee: 50 } as const;

/** Prize distribution (USD-denominated, paid in $BLOBBIE when live). */
export const PRIZE_DISTRIBUTION = {
  first: { winners: 1, usdEach: 102, label: "1st Place" },
  top10: { winners: 9, usdEach: 4, label: "2nd – 10th" },
  top150: { winners: 140, usdEach: 1, label: "11th – 150th" },
} as const;

export const POOL_ALLOCATION = {
  winnerPayout: 278,
  freeDailyEntries: 10,
  jackpot: 5,
  burnTreasury: 7,
} as const;

export const TOTAL_WINNERS =
  PRIZE_DISTRIBUTION.first.winners +
  PRIZE_DISTRIBUTION.top10.winners +
  PRIZE_DISTRIBUTION.top150.winners; // 150

export type RoundStatusUI =
  | "OPEN"
  | "CLOSING_SOON"
  | "FILLED"
  | "AWAITING_DRAW"
  | "COMPLETED";

export const ROUND_STATUS_LABELS: Record<RoundStatusUI, string> = {
  OPEN: "Open",
  CLOSING_SOON: "Closing Soon",
  FILLED: "Filled",
  AWAITING_DRAW: "Awaiting Draw",
  COMPLETED: "Completed",
};

export const AIRDROP_DISCLAIMER =
  "Airdrop Points track beta contribution. Final rewards are subject to verification.";

export const BETA_MOCK_LABEL = "Beta Mock Mode";

/** Default airdrop campaign slug used by the seed + APIs. */
export const DEFAULT_CAMPAIGN_SLUG = "blobbie-beta";

/** Airdrop task definitions (seeded into DB; keys are stable API contracts). */
export const AIRDROP_TASKS = [
  {
    key: "connect_wallet",
    title: "Connect Wallet",
    description: "Connect a BNB Chain wallet to the Blobbie Playground.",
    points: 50,
    type: "ONE_TIME",
    status: "ACTIVE",
    requiresAdmin: false,
    sortOrder: 1,
  },
  {
    key: "join_playground",
    title: "Join Playground",
    description: "Enter the Blobbie Playground hub for the first time.",
    points: 50,
    type: "ONE_TIME",
    status: "ACTIVE",
    requiresAdmin: false,
    sortOrder: 2,
  },
  {
    key: "view_daily_draw",
    title: "View Daily Rewards Draw",
    description: "Open the Daily Rewards Draw and review the current round.",
    points: 30,
    type: "ONE_TIME",
    status: "ACTIVE",
    requiresAdmin: false,
    sortOrder: 3,
  },
  {
    key: "buy_ticket",
    title: "Buy a Daily Rewards Draw Ticket",
    description: "Purchase at least one ticket in an open round.",
    points: 100,
    type: "ONE_TIME",
    status: "ACTIVE",
    requiresAdmin: false,
    sortOrder: 4,
  },
  {
    key: "return_daily",
    title: "Return Daily",
    description: "Check in once every 24 hours to keep your streak.",
    points: 20,
    type: "DAILY",
    status: "ACTIVE",
    requiresAdmin: false,
    sortOrder: 5,
  },
  // "Invite a Friend" is now a live feature — see the Referrals panel
  // (src/components/referral-panel.tsx), not a Coming Soon task.
  {
    key: "minigames",
    title: "Play a Mini-Game",
    description: "Blobbie Dash, Blast & Stack arrive soon.",
    points: 0,
    type: "MANUAL",
    status: "COMING_SOON",
    requiresAdmin: true,
    sortOrder: 7,
  },
  // Note: Follow on X and Join Telegram are handled by the dedicated Social
  // Tasks system (see src/lib/social/* and the Social Tasks UI), not here.
] as const;

export type AirdropTaskKey = (typeof AIRDROP_TASKS)[number]["key"];
