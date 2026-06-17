import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { profileUpdateSchema } from "@/lib/validation";
import { getSession } from "@/lib/auth";
import { getProfile, updateProfile } from "@/lib/services/profile";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);
    const profile = await getProfile(session.wallet);
    return ok({ profile });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect and verify your wallet first.", 401);

    const rl = rateLimit(session.wallet, {
      limit: 20,
      windowMs: 60_000,
      bucket: "profile-update",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    const body = await req.json();
    const input = profileUpdateSchema.parse(body);
    const profile = await updateProfile(session.wallet, input);
    return ok({ profile });
  } catch (err) {
    return handleError(err);
  }
}
