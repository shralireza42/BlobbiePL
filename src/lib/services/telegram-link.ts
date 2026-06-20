import "server-only";
import { randomBytes } from "crypto";
import { prisma, hasDatabase } from "../prisma";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Telegram /start payloads must be [A-Za-z0-9_-]{1,64}. */
function makeCode(): string {
  return randomBytes(16).toString("base64url").slice(0, 32);
}

/**
 * Create a single-use deep-link token tying a Telegram `/start <code>` to a
 * wallet. Returns the code embedded in the bot deep link.
 */
export async function createTelegramLinkToken(wallet: string): Promise<string | null> {
  if (!hasDatabase) return null;
  const lowered = wallet.toLowerCase();
  const code = makeCode();
  await prisma.telegramLinkToken.create({
    data: {
      code,
      wallet: lowered,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return code;
}

/**
 * Peek at a /start token WITHOUT consuming it. Returns the linked wallet
 * (lowercased) if the token is valid, unused and unexpired; otherwise null.
 * Used so we don't burn the token when channel-membership gating fails (the
 * same link should still work after the user joins the channel and retries).
 */
export async function peekTelegramLinkToken(
  code: string,
): Promise<string | null> {
  if (!hasDatabase || !code) return null;
  const token = await prisma.telegramLinkToken.findUnique({ where: { code } });
  if (!token) return null;
  if (token.usedAt) return null;
  if (token.expiresAt.getTime() < Date.now()) return null;
  return token.wallet;
}

/** Mark a /start token as used (single-use). Safe to call once linking succeeds. */
export async function markTelegramLinkTokenUsed(code: string): Promise<void> {
  if (!hasDatabase || !code) return;
  await prisma.telegramLinkToken.updateMany({
    where: { code, usedAt: null },
    data: { usedAt: new Date() },
  });
}
