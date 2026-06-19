import "server-only";

/**
 * Server-only social verification config. Secrets never reach the client; the
 * UI learns availability through /api/social/status (which uses these helpers).
 */

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const socialConfig = {
  x: {
    enabled: process.env.ENABLE_X_VERIFICATION === "true",
    clientId: process.env.X_CLIENT_ID ?? "",
    clientSecret: process.env.X_CLIENT_SECRET ?? "",
    redirectUri: process.env.X_REDIRECT_URI ?? "",
    bearerToken: process.env.X_BEARER_TOKEN ?? "",
    targetUsername: (process.env.X_BLOBBIE_USERNAME ?? "xBlobbie").replace(/^@/, ""),
    targetUserId: process.env.X_BLOBBIE_USER_ID ?? "",
    apiBaseUrl: (process.env.X_API_BASE_URL ?? "https://api.x.com/2").replace(/\/$/, ""),
    scopes: ["tweet.read", "users.read", "follows.read", "offline.access"],
  },
  telegram: {
    enabled: process.env.ENABLE_TELEGRAM_VERIFICATION === "true",
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    botUsername: (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, ""),
    chatId: process.env.TELEGRAM_CHAT_ID ?? "",
    channelUrl: process.env.TELEGRAM_CHANNEL_URL ?? "",
  },
  points: {
    FOLLOW_X: num(process.env.AIRDROP_X_FOLLOW_POINTS, 100),
    JOIN_TELEGRAM: num(process.env.AIRDROP_TELEGRAM_JOIN_POINTS, 75),
    BONUS_SOCIAL: num(process.env.AIRDROP_BONUS_SOCIAL_POINTS, 50),
  },
} as const;

/** X OAuth + verification fully configured? */
export function xConfigured(): boolean {
  const x = socialConfig.x;
  return (
    x.enabled &&
    !!x.clientId &&
    !!x.clientSecret &&
    !!x.redirectUri
  );
}

/** Telegram verification fully configured? */
export function telegramConfigured(): boolean {
  const t = socialConfig.telegram;
  return t.enabled && !!t.botToken && !!t.chatId;
}

export type SocialTaskCode = "FOLLOW_X" | "JOIN_TELEGRAM" | "BONUS_SOCIAL";

/** Stable mapping from spec codes to existing AirdropTask keys. */
export const SOCIAL_TASK_KEYS: Record<SocialTaskCode, string> = {
  FOLLOW_X: "follow_x",
  JOIN_TELEGRAM: "join_telegram",
  BONUS_SOCIAL: "bonus_social",
};

export const SOCIAL_TASK_DEFS: {
  code: SocialTaskCode;
  key: string;
  title: string;
  description: string;
  provider: "x" | "telegram" | null;
  points: number;
  sortOrder: number;
}[] = [
  {
    code: "FOLLOW_X",
    key: SOCIAL_TASK_KEYS.FOLLOW_X,
    title: "Follow @xBlobbie on X",
    description: "Connect your X account and follow @xBlobbie to verify.",
    provider: "x",
    points: socialConfig.points.FOLLOW_X,
    sortOrder: 20,
  },
  {
    code: "JOIN_TELEGRAM",
    key: SOCIAL_TASK_KEYS.JOIN_TELEGRAM,
    title: "Join the Blobbie Telegram",
    description: "Connect Telegram and join the official channel to verify.",
    provider: "telegram",
    points: socialConfig.points.JOIN_TELEGRAM,
    sortOrder: 21,
  },
  {
    code: "BONUS_SOCIAL",
    key: SOCIAL_TASK_KEYS.BONUS_SOCIAL,
    title: "Social Bonus",
    description: "Complete both social tasks to unlock a one-time bonus.",
    provider: null,
    points: socialConfig.points.BONUS_SOCIAL,
    sortOrder: 22,
  },
];
