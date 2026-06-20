import "server-only";
import { telegramConfigured, socialConfig } from "@/lib/social/config";
import {
  isValidTelegramAuth,
  getChatMemberStatus,
  type TelegramAuthData,
} from "@/lib/social/telegram";
import {
  getOrCreateUser,
  getSocialAccount,
  linkSocialAccount,
  confirmSocialTask,
  failSocialTask,
} from "@/lib/services/social";

export type TelegramVerifyResult = {
  status: "confirmed" | "failed";
  message: string;
  bonusGranted?: boolean;
  bonusPoints?: number;
  totalPoints?: number;
};

/**
 * Verify (and award) the Join-Telegram task for a wallet. Shared by the POST
 * verify endpoint (widget popup payload) and the GET callback (redirect flow):
 *  - If `authData` is provided, validate the Telegram Login signature + link it.
 *  - Otherwise, use the already-linked Telegram account.
 * Then confirm channel membership via the Bot API before granting points.
 */
export async function verifyTelegramJoin(
  wallet: string,
  authData?: TelegramAuthData | null,
): Promise<TelegramVerifyResult> {
  if (!telegramConfigured()) {
    return {
      status: "failed",
      message: "Telegram verification is temporarily unavailable. Try again later.",
    };
  }

  const user = await getOrCreateUser(wallet);

  let providerUserId: string | null = null;
  if (authData) {
    if (!isValidTelegramAuth(authData, socialConfig.telegram.botToken)) {
      return {
        status: "failed",
        message: "Telegram login could not be verified. Try again.",
      };
    }
    const link = await linkSocialAccount({
      userId: user.id,
      provider: "TELEGRAM",
      providerUserId: String(authData.id),
      username: (authData.username as string) ?? null,
    });
    if (!link.ok) {
      return { status: "failed", message: link.reason ?? "Could not link Telegram." };
    }
    providerUserId = String(authData.id);
  } else {
    const account = await getSocialAccount(user.id, "TELEGRAM");
    providerUserId = account?.providerUserId ?? null;
  }

  if (!providerUserId) {
    return { status: "failed", message: "Connect Telegram first." };
  }

  const membership = await getChatMemberStatus(providerUserId);
  if (!membership.available) {
    await failSocialTask(wallet, "JOIN_TELEGRAM", "unavailable");
    return {
      status: "failed",
      message: "Telegram verification is temporarily unavailable. Try again later.",
    };
  }
  if (!membership.member) {
    await failSocialTask(wallet, "JOIN_TELEGRAM", "not_member");
    return { status: "failed", message: "Join Telegram first, then verify again." };
  }

  const confirm = await confirmSocialTask(
    wallet,
    "JOIN_TELEGRAM",
    "Telegram join verified. Points confirmed.",
  );
  return {
    status: confirm.status,
    message: confirm.message,
    bonusGranted: confirm.bonusGranted ?? false,
    bonusPoints: confirm.bonusPoints ?? 0,
    totalPoints: confirm.totalPoints,
  };
}

/** Parse Telegram Login query params (redirect flow) into a TelegramAuthData. */
export function parseTelegramQuery(
  params: URLSearchParams,
): TelegramAuthData | null {
  const id = params.get("id");
  const hash = params.get("hash");
  const authDate = params.get("auth_date");
  if (!id || !hash || !authDate) return null;
  const data: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    // Only the fields Telegram signs (skip our own routing params).
    if (["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"].includes(k)) {
      data[k] = v;
    }
  }
  return data as unknown as TelegramAuthData;
}
