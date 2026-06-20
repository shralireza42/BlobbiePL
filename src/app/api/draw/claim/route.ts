import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { claimPrizeSchema } from "@/lib/validation";
import { getSession } from "@/lib/auth";
import { getDrawProvider, isMockMode } from "@/lib/contracts";
import { claimWinnings } from "@/lib/services/draw";
import { isSiteBanned } from "@/lib/services/moderation";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);

    const rl = rateLimit(session.wallet, {
      limit: 10,
      windowMs: 60_000,
      bucket: "draw-claim",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    if (await isSiteBanned(session.wallet)) {
      return fail("Your account is banned from the site.", 403);
    }

    const body = await req.json();
    const { roundId } = claimPrizeSchema.parse(body);

    // Mark the DB winner as claimed (one-time). The on-chain provider call is
    // the real settlement path when contracts are live.
    const result = await claimWinnings(session.wallet, roundId);
    if (!result.ok) return fail(result.message, 409);

    const tx = await getDrawProvider().claimPrize(
      roundId,
      session.wallet as `0x${string}`,
    );

    return ok({ ...result, tx, isMockMode: isMockMode() });
  } catch (err) {
    return handleError(err);
  }
}
