import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { claimPrizeSchema } from "@/lib/validation";
import { getSession } from "@/lib/auth";
import { getDrawProvider, isMockMode } from "@/lib/contracts";
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

    const body = await req.json();
    const { roundId } = claimPrizeSchema.parse(body);

    const tx = await getDrawProvider().claimPrize(
      roundId,
      session.wallet as `0x${string}`,
    );

    return ok({ tx, isMockMode: isMockMode() });
  } catch (err) {
    return handleError(err);
  }
}
