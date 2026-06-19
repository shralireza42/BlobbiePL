import { z } from "zod";
import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
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

const POINTS = socialConfig.points.JOIN_TELEGRAM;

const schema = z.object({
  telegram: z.record(z.any()).optional(),
});

function task(status: "confirmed" | "failed", message: string, extra?: object) {
  return { task: { code: "JOIN_TELEGRAM", status, points: POINTS, message }, ...extra };
}

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);

    const rl = rateLimit(session.wallet, {
      limit: 8,
      windowMs: 60_000,
      bucket: "verify-join-telegram",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    if (!telegramConfigured()) {
      return ok(task("failed", "Telegram verification is temporarily unavailable. Try again later."));
    }

    const { telegram } = schema.parse(await req.json().catch(() => ({})));
    const user = await getOrCreateUser(session.wallet);

    // Link via signed Telegram Login Widget payload (if provided).
    let providerUserId: string | null = null;
    if (telegram) {
      const authData = telegram as TelegramAuthData;
      if (!isValidTelegramAuth(authData, socialConfig.telegram.botToken)) {
        return ok(task("failed", "Telegram login could not be verified. Try again."));
      }
      const link = await linkSocialAccount({
        userId: user.id,
        provider: "TELEGRAM",
        providerUserId: String(authData.id),
        username: (authData.username as string) ?? null,
      });
      if (!link.ok) return ok(task("failed", link.reason ?? "Could not link Telegram."));
      providerUserId = String(authData.id);
    } else {
      const account = await getSocialAccount(user.id, "TELEGRAM");
      providerUserId = account?.providerUserId ?? null;
    }

    if (!providerUserId) {
      return ok(task("failed", "Connect Telegram first."));
    }

    const membership = await getChatMemberStatus(providerUserId);
    if (!membership.available) {
      await failSocialTask(session.wallet, "JOIN_TELEGRAM", "unavailable");
      return ok(task("failed", "Telegram verification is temporarily unavailable. Try again later."));
    }
    if (!membership.member) {
      await failSocialTask(session.wallet, "JOIN_TELEGRAM", "not_member");
      return ok(task("failed", "Join Telegram first, then verify again."));
    }

    const confirm = await confirmSocialTask(
      session.wallet,
      "JOIN_TELEGRAM",
      "Telegram join verified. Points confirmed.",
    );
    return ok(
      task(confirm.status, confirm.message, {
        bonusGranted: confirm.bonusGranted ?? false,
        bonusPoints: confirm.bonusPoints ?? 0,
        totalPoints: confirm.totalPoints,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}
