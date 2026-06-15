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
  nfts: "/nfts",
} as const;

export type PlaygroundCard = {
  title: string;
  description: string;
  href: string;
  status: "active" | "coming-soon";
  accent: "cyan" | "purple" | "blue" | "pink";
  icon: string;
};

export const PLAYGROUND_CARDS: PlaygroundCard[] = [
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
  {
    title: "Blobbie Dash",
    description: "Endless neon runner mini-game.",
    href: ROUTES.dash,
    status: "coming-soon",
    accent: "blue",
    icon: "dash",
  },
  {
    title: "Blobbie Blast",
    description: "Arcade blaster with on-chain scores.",
    href: ROUTES.blast,
    status: "coming-soon",
    accent: "pink",
    icon: "blast",
  },
  {
    title: "Blobbie Stack",
    description: "Stack blocks, stack rewards.",
    href: ROUTES.stack,
    status: "coming-soon",
    accent: "cyan",
    icon: "stack",
  },
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
  {
    title: "Blobbie NFTs",
    description: "Collectible Blobbie characters.",
    href: ROUTES.nfts,
    status: "coming-soon",
    accent: "purple",
    icon: "nft",
  },
];
