import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { bugReportSchema } from "@/lib/validation";
import { getSession } from "@/lib/auth";
import { submitBugReport } from "@/lib/services/bug-bounty";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { privacyHash } from "@/lib/hash";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = getSession();
    const identifier = session?.wallet ?? clientIdentifier(req);

    const rl = rateLimit(identifier, {
      limit: 5,
      windowMs: 60 * 60_000, // 5 reports per hour
      bucket: "bug-report",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    const body = await req.json();
    const input = bugReportSchema.parse(body);

    const result = await submitBugReport(input, {
      reporterWallet: session?.wallet ?? null,
      ipHash: privacyHash(clientIdentifier(req)),
    });

    if (!result.ok) return fail(result.message, 400);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
