import { ok, fail, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getReferralProfile } from "@/lib/services/referral";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);
    const profile = await getReferralProfile(session.wallet);
    return ok(profile);
  } catch (err) {
    return handleError(err);
  }
}
