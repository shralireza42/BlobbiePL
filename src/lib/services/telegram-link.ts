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
 * Consume a /start token. Returns the linked wallet (lowercased) if the token
 * is valid, unused and unexpired; otherwise null. Marks the token used.
 */
export async function consumeTelegramLinkToken(
  code: string,
): Promise<string | null> {
  if (!hasDatabase || !code) return null;
  const token = await prisma.telegramLinkToken.findUnique({ where: { code } });
  if (!token) return null;
  if (token.usedAt) return null;
  if (token.expiresAt.getTime() < Date.now()) return null;
  await prisma.telegramLinkToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });
  return token.wallet;
}
