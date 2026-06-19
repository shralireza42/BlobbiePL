import { z } from "zod";
import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { claimTask, awardVerifiedTask } from "@/lib/services/airdrop";
import {
  telegramConfigured,
  verifyTelegramMembership,
  type TelegramAuthData,
} from "@/lib/social-verify";

const verifySchema = z.object({
  taskKey: z.enum(["follow_x", "join_telegram"]),
  // Telegram Login Widget payload (when the user verifies via Telegram).
  telegram: z.record(z.any()).optional(),
});

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect and verify your wallet first.", 401);

    const rl = rateLimit(session.wallet, {
      limit: 20,
      windowMs: 60_000,
      bucket: "airdrop-verify",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    const body = await req.json();
    const { taskKey, telegram } = verifySchema.parse(body);

    // --- Telegram: real auto-verification when the bot is configured ---
    if (taskKey === "join_telegram") {
      if (telegramConfigured() && telegram) {
        const result = await verifyTelegramMembership(telegram as TelegramAuthData);
        if (!result.ok) {
          return fail(result.reason ?? "Telegram verification failed.", 422);
        }
        const award = await awardVerifiedTask(session.wallet, taskKey);
        return ok({ verified: true, ...award });
      }
      // Not configured / no payload → submit for manual review (never auto-award).
      const pending = await claimTask(session.wallet, taskKey);
      return ok({
        verified: false,
        pending: true,
        ...pending,
        message:
          "Submitted for verification. Points are awarded once membership is confirmed.",
      });
    }

    // --- X (Twitter): requires OAuth follow-check; until configured, review ---
    const pending = await claimTask(session.wallet, taskKey);
    return ok({
      verified: false,
      pending: true,
      ...pending,
      message:
        "Submitted for verification. Points are awarded once your follow is confirmed.",
    });
  } catch (err) {
    return handleError(err);
  }
}
