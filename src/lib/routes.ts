/** Route registry + Playground card definitions. */

export const ROUTES = {
  home: "/",
  playground: "/playground",
  dailyDraw: "/daily-draw",
  airdrop: "/airdrop",
  dashboard: "/dashboard",
  admin: "/admin",
  verify: "/verify",
  // Coming soon
  dash: "/playground/dash",
  blast: "/playground/blast",
  stack: "/playground/stack",
  referrals: "/referrals",
  freeEntries: "/free-entries",
  staking: "/staking",
  jackpot: "/jackpot",
} as const;

export type PlaygroundCard = {
  title: string;
  description: string;
  href: string;
  status: "active" | "coming-soon";
  accent: "cyan" | "purple" | "blue" | "pink";
  icon: string;
};

/** Active modules shown everywhere (homepage + playground). */
export const ACTIVE_CARDS: PlaygroundCard[] = [
  {
    title: "Daily Rewards Draw",
    description:
      "Join the 24h on-chain rewards round. 1 ticket = $1 in $BLOBBIE.",
    href: ROUTES.dailyDraw,
    status: "active",
    accent: "cyan",
    icon: "draw",
  },
  {
    title: "Airdrop Hub",
    description:
      "Complete beta actions, earn Airdrop Points, climb the leaderboard.",
    href: ROUTES.airdrop,
    status: "active",
    accent: "purple",
    icon: "airdrop",
  },
];

export type GameCard = {
  title: string;
  description: string;
  href: string;
  /** Swappable preview image — change the file in /public/games to update. */
  image: string;
  accent: "lime" | "green" | "cream";
};

/** Mini-games — rendered in their own "Games — Coming Soon" section. */
export const GAME_CARDS: GameCard[] = [
  {
    title: "Blobbie Dash",
    description: "Endless neon runner with on-chain scores.",
    href: ROUTES.dash,
    image: "/games/dash.svg",
    accent: "lime",
  },
  {
    title: "Blobbie Blast",
    description: "Arcade blaster with seasonal leaderboards.",
    href: ROUTES.blast,
    image: "/games/blast.svg",
    accent: "green",
  },
  {
    title: "Blobbie Stack",
    description: "Stack blocks, stack rewards.",
    href: ROUTES.stack,
    image: "/games/stack.svg",
    accent: "cream",
  },
];

const REFERRALS_CARD: PlaygroundCard = {
  title: "Referrals",
  description: "Invite friends, earn free entries.",
  href: ROUTES.referrals,
  status: "coming-soon",
  accent: "purple",
  icon: "referral",
};

const FREE_ENTRIES_CARD: PlaygroundCard = {
  title: "Free Daily Entries",
  description: "Earn tickets through community tasks.",
  href: ROUTES.freeEntries,
  status: "coming-soon",
  accent: "blue",
  icon: "gift",
};

const STAKING_CARD: PlaygroundCard = {
  title: "Staking",
  description: "Stake $BLOBBIE for passive rewards.",
  href: ROUTES.staking,
  status: "coming-soon",
  accent: "cyan",
  icon: "stake",
};

/** Blobbie Vault Burst (Jackpot) — the only Coming Soon shown on the home page. */
export const JACKPOT_CARD: PlaygroundCard = {
  title: "Blobbie Vault Burst",
  description: "A progressive jackpot vault funded partly by the Daily Rewards Draw.",
  href: ROUTES.jackpot,
  status: "coming-soon",
  accent: "pink",
  icon: "vault",
};

/** Coming Soon modules surfaced on the Daily Rewards Draw page (Referrals is
 * now live, so it's excluded). */
export const DRAW_COMING_SOON_CARDS: PlaygroundCard[] = [
  FREE_ENTRIES_CARD,
  STAKING_CARD,
];

/** Full Coming Soon set for the Playground hub. */
export const PLAYGROUND_ONLY_CARDS: PlaygroundCard[] = [
  REFERRALS_CARD,
  FREE_ENTRIES_CARD,
  STAKING_CARD,
  JACKPOT_CARD,
];
