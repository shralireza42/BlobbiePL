import "server-only";
import { createHash, createHmac } from "crypto";

/**
 * Real social verification for Airdrop tasks. Nothing is awarded on a plain
 * click — a task only completes when verification passes (or an admin approves).
 *
 * Telegram: cryptographically verifies the Telegram Login Widget payload with
 * the bot token, then checks group/channel membership via getChatMember.
 *
 * X (Twitter): verifies a follow via the X API. This requires the user's X id,
 * which is obtained through X OAuth (scaffolded); until configured, X tasks fall
 * back to admin review so points can never be claimed for a fake follow.
 */

export const socialEnv = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",
  xBearerToken: process.env.X_BEARER_TOKEN ?? "",
  xTargetUserId: process.env.X_TARGET_USER_ID ?? "",
};

export function telegramConfigured(): boolean {
  return !!socialEnv.telegramBotToken && !!socialEnv.telegramChatId;
}

export function xConfigured(): boolean {
  return !!socialEnv.xBearerToken && !!socialEnv.xTargetUserId;
}

export type VerifyResult = { ok: boolean; reason?: string };

export type TelegramAuthData = {
  id: number | string;
  hash: string;
  auth_date: number | string;
  [key: string]: unknown;
};

/** Validate the Telegram Login Widget payload signature (proves it's genuine). */
function isValidTelegramAuth(data: TelegramAuthData): boolean {
  if (!socialEnv.telegramBotToken || !data?.hash) return false;
  const { hash, ...rest } = data;
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k as keyof typeof rest]}`)
    .join("\n");
  const secret = createHash("sha256").update(socialEnv.telegramBotToken).digest();
  const hmac = createHmac("sha256", secret).update(checkString).digest("hex");
  if (hmac !== hash) return false;
  // Reject stale logins (older than 1 day).
  const authDate = Number(data.auth_date) * 1000;
  if (!authDate || Date.now() - authDate > 24 * 60 * 60 * 1000) return false;
  return true;
}

export async function verifyTelegramMembership(
  data: TelegramAuthData,
): Promise<VerifyResult> {
  if (!telegramConfigured()) {
    return { ok: false, reason: "Telegram verification is not configured." };
  }
  if (!isValidTelegramAuth(data)) {
    return { ok: false, reason: "Telegram login could not be verified." };
  }
  try {
    const url = `https://api.telegram.org/bot${socialEnv.telegramBotToken}/getChatMember?chat_id=${encodeURIComponent(
      socialEnv.telegramChatId,
    )}&user_id=${encodeURIComponent(String(data.id))}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as {
      ok: boolean;
      result?: { status?: string };
    };
    const status = json?.result?.status;
    const member = ["member", "administrator", "creator", "restricted"].includes(
      status ?? "",
    );
    return member
      ? { ok: true }
      : { ok: false, reason: "You are not a member of the Telegram group yet." };
  } catch {
    return { ok: false, reason: "Could not reach Telegram. Try again later." };
  }
}

/** Verify that `sourceUserId` follows the configured target X account. */
export async function verifyXFollow(sourceUserId: string): Promise<VerifyResult> {
  if (!xConfigured()) {
    return { ok: false, reason: "X verification is not configured." };
  }
  try {
    const res = await fetch(
      `https://api.twitter.com/2/users/${encodeURIComponent(
        sourceUserId,
      )}/following?max_results=1000`,
      {
        headers: { Authorization: `Bearer ${socialEnv.xBearerToken}` },
        cache: "no-store",
      },
    );
    const json = (await res.json()) as { data?: { id: string }[] };
    const follows = (json.data ?? []).some(
      (u) => u.id === socialEnv.xTargetUserId,
    );
    return follows
      ? { ok: true }
      : { ok: false, reason: "We couldn't confirm you follow @Blobbie on X." };
  } catch {
    return { ok: false, reason: "Could not reach the X API. Try again later." };
  }
}
