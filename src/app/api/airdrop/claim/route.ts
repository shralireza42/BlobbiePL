import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { taskClaimSchema } from "@/lib/validation";
import { getSession } from "@/lib/auth";
import { claimTask } from "@/lib/services/airdrop";
import { isSiteBanned } from "@/lib/services/moderation";
import { getFeatures } from "@/lib/services/features";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { privacyHash } from "@/lib/hash";

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);

    const rl = rateLimit(session.wallet, {
      limit: 30,
      windowMs: 60_000,
      bucket: "airdrop-claim",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    if (await isSiteBanned(session.wallet)) {
      return fail("Your account is banned from the site.", 403);
    }
    if (!(await getFeatures()).airdropEnabled) {
      return fail("The Airdrop Hub is temporarily paused.", 403);
    }

    const body = await req.json();
    const { taskKey } = taskClaimSchema.parse(body);

    const ipHash = privacyHash(clientIdentifier(req));
    const deviceHash = privacyHash(req.headers.get("user-agent"));

    const result = await claimTask(session.wallet, taskKey, {
      ipHash,
      deviceHash,
    });

    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
