import "server-only";
import { socialConfig } from "./config";
import { isMemberStatus, isValidTelegramAuth, type TelegramAuthData } from "./pure";

/**
 * Telegram Login Widget validation + group membership verification via the
 * official Bot API. Membership check fails closed when the API is unavailable.
 * Pure validation lives in ./pure (re-exported here for convenience).
 */
export { isMemberStatus, isValidTelegramAuth };
export type { TelegramAuthData };

export type MembershipCheck = {
  member: boolean;
  available: boolean; // false when the Bot API was unreachable
  status?: string;
};

export async function getChatMemberStatus(
  userId: string | number,
): Promise<MembershipCheck> {
  const { botToken, chatId } = socialConfig.telegram;
  if (!botToken || !chatId) return { member: false, available: false };
  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(
      chatId,
    )}&user_id=${encodeURIComponent(String(userId))}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { member: false, available: false };
    const json = (await res.json()) as {
      ok: boolean;
      result?: { status?: string };
    };
    if (!json.ok) return { member: false, available: false };
    const status = json.result?.status;
    return { member: isMemberStatus(status), available: true, status };
  } catch {
    return { member: false, available: false };
  }
}
