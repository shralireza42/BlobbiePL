import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { xConfigured, socialConfig } from "@/lib/social/config";
import { checkFollows, resolveTargetUserId } from "@/lib/social/x";
import { decryptToken } from "@/lib/social/crypto";
import {
  getOrCreateUser,
  getSocialAccount,
  confirmSocialTask,
  failSocialTask,
} from "@/lib/services/social";

const POINTS = socialConfig.points.FOLLOW_X;

function task(status: "confirmed" | "failed", message: string, extra?: object) {
  return { task: { code: "FOLLOW_X", status, points: POINTS, message }, ...extra };
}

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);

    const rl = rateLimit(session.wallet, {
      limit: 8,
      windowMs: 60_000,
      bucket: "verify-follow-x",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    if (!xConfigured()) {
      return ok(task("failed", "X verification is temporarily unavailable. Try again later."));
    }

    const user = await getOrCreateUser(session.wallet);
    const account = await getSocialAccount(user.id, "X");
    if (!account) {
      return ok(task("failed", "Connect X first."));
    }

    const accessToken = decryptToken(account.accessTokenEncrypted);
    if (!accessToken) {
      return ok(task("failed", "X verification is temporarily unavailable. Try again later."));
    }

    const targetId = await resolveTargetUserId();
    if (!targetId) {
      return ok(task("failed", "X verification is temporarily unavailable. Try again later."));
    }

    const result = await checkFollows(account.providerUserId, targetId, accessToken);
    if (!result.available) {
      await failSocialTask(session.wallet, "FOLLOW_X", "unavailable");
      return ok(task("failed", "X verification is temporarily unavailable. Try again later."));
    }
    if (!result.follows) {
      await failSocialTask(session.wallet, "FOLLOW_X", "not_following");
      return ok(task("failed", "Follow @xBlobbie first, then verify again."));
    }

    const confirm = await confirmSocialTask(
      session.wallet,
      "FOLLOW_X",
      "X follow verified. Points confirmed.",
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
