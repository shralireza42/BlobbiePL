import { ok, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getAirdropProfile } from "@/lib/services/airdrop";
import { AIRDROP_DISCLAIMER } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    const profile = await getAirdropProfile(session?.wallet ?? null);
    return ok({ profile, disclaimer: AIRDROP_DISCLAIMER });
  } catch (err) {
    return handleError(err);
  }
}
