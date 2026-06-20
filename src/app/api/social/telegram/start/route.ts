import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { telegramConfigured, socialConfig } from "@/lib/social/config";
import { createTelegramLinkToken } from "@/lib/services/telegram-link";

export const dynamic = "force-dynamic";

/**
 * Begin the bot deep-link Telegram connect flow. Returns a one-time
 * `https://t.me/<bot>?start=<code>` link. The user taps Start in Telegram; the
 * bot webhook then links their Telegram account to this wallet.
 */
export async function GET() {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);

    const rl = rateLimit(session.wallet, {
      limit: 10,
      windowMs: 60_000,
      bucket: "telegram-start",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    const botUsername = socialConfig.telegram.botUsername;
    if (!telegramConfigured() || !botUsername) {
      return fail("Telegram connect is temporarily unavailable.", 503);
    }

    const code = await createTelegramLinkToken(session.wallet);
    if (!code) {
      return fail("Telegram connect requires a configured database.", 503);
    }

    return ok({
      botUsername,
      url: `https://t.me/${botUsername}?start=${code}`,
      channelUrl: socialConfig.telegram.channelUrl || null,
    });
  } catch (err) {
    return handleError(err);
  }
}
