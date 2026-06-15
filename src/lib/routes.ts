/** Route registry + Playground card definitions. */

export const ROUTES = {
  home: "/",
  playground: "/playground",
  dailyDraw: "/daily-draw",
  airdrop: "/airdrop",
  dashboard: "/dashboard",
  admin: "/admin",
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

/**
 * Other Coming Soon modules. Per product spec, Free Daily Entries, Staking and
 * Blobbie Vault Burst (Jackpot) are surfaced ONLY on the Playground page.
 */
export const PLAYGROUND_ONLY_CARDS: PlaygroundCard[] = [
  {
    title: "Referrals",
    description: "Invite friends, earn free entries.",
    href: ROUTES.referrals,
    status: "coming-soon",
    accent: "purple",
    icon: "referral",
  },
  {
    title: "Free Daily Entries",
    description: "Earn tickets through community tasks.",
    href: ROUTES.freeEntries,
    status: "coming-soon",
    accent: "blue",
    icon: "gift",
  },
  {
    title: "Staking",
    description: "Stake $BLOBBIE for passive rewards.",
    href: ROUTES.staking,
    status: "coming-soon",
    accent: "cyan",
    icon: "stake",
  },
  {
    title: "Blobbie Vault Burst",
    description: "Progressive jackpot vault.",
    href: ROUTES.jackpot,
    status: "coming-soon",
    accent: "pink",
    icon: "vault",
  },
];
