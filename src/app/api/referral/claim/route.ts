import { z } from "zod";
import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { claimReferral } from "@/lib/services/referral";
import { isSiteBanned } from "@/lib/services/moderation";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ code: z.string().trim().min(4).max(32) });

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);

    const rl = rateLimit(session.wallet, {
      limit: 10,
      windowMs: 60_000,
      bucket: "referral-claim",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    if (await isSiteBanned(session.wallet)) {
      return fail("Your account is banned from the site.", 403);
    }

    const { code } = schema.parse(await req.json());
    const result = await claimReferral(session.wallet, code);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
