import { z } from "zod";
import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { socialConfig } from "@/lib/social/config";
import type { TelegramAuthData } from "@/lib/social/telegram";
import { verifyTelegramJoin } from "@/lib/services/social-verify";

const POINTS = socialConfig.points.JOIN_TELEGRAM;

const schema = z.object({
  telegram: z.record(z.any()).optional(),
});

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

    const { telegram } = schema.parse(await req.json().catch(() => ({})));
    const result = await verifyTelegramJoin(
      session.wallet,
      (telegram as TelegramAuthData) ?? null,
    );

    return ok({
      task: {
        code: "JOIN_TELEGRAM",
        status: result.status,
        points: POINTS,
        message: result.message,
      },
      bonusGranted: result.bonusGranted ?? false,
      bonusPoints: result.bonusPoints ?? 0,
      totalPoints: result.totalPoints,
    });
  } catch (err) {
    return handleError(err);
  }
}
