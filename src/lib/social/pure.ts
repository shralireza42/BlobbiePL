import { createHash, createHmac, timingSafeEqual } from "crypto";

/**
 * Pure, dependency-light social helpers. No `server-only` marker so they can be
 * unit-tested directly. These never perform network or DB I/O.
 */

export type TelegramAuthData = {
  id: number | string;
  hash: string;
  auth_date: number | string;
  username?: string;
  [key: string]: unknown;
};

/** Valid Telegram getChatMember statuses that count as "joined". */
export function isMemberStatus(status: string | null | undefined): boolean {
  return ["creator", "administrator", "member", "restricted"].includes(
    status ?? "",
  );
}

/** Does the following-id list contain the target account id? */
export function detectFollow(followingIds: string[], targetId: string): boolean {
  return !!targetId && followingIds.includes(targetId);
}

/** Bonus is granted exactly once, only when both social tasks are confirmed. */
export function shouldGrantBonus(
  followXConfirmed: boolean,
  joinTelegramConfirmed: boolean,
  bonusAlreadyConfirmed: boolean,
): boolean {
  return followXConfirmed && joinTelegramConfirmed && !bonusAlreadyConfirmed;
}

/** Validate a Telegram Login Widget payload signature against a bot token. */
export function isValidTelegramAuth(
  data: TelegramAuthData,
  botToken: string,
  maxAgeMs = 24 * 60 * 60 * 1000,
  now = Date.now(),
): boolean {
  if (!botToken || !data?.hash) return false;
  const { hash, ...rest } = data;
  const checkString = Object.keys(rest)
    .filter((k) => rest[k] !== undefined && rest[k] !== null)
    .sort()
    .map((k) => `${k}=${rest[k as keyof typeof rest]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const hmac = createHmac("sha256", secret).update(checkString).digest("hex");
  const a = Buffer.from(hmac);
  const b = Buffer.from(hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const authDate = Number(data.auth_date) * 1000;
  if (!authDate || now - authDate > maxAgeMs) return false;
  return true;
}

/** Helper for tests/clients: compute the valid hash for a Telegram payload. */
export function computeTelegramHash(
  data: Record<string, unknown>,
  botToken: string,
): string {
  const checkString = Object.keys(data)
    .filter((k) => k !== "hash" && data[k] !== undefined && data[k] !== null)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  return createHmac("sha256", secret).update(checkString).digest("hex");
}
