import { ok, fail, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getMyWinnings } from "@/lib/services/draw";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);
    const winnings = await getMyWinnings(session.wallet);
    return ok({ winnings });
  } catch (err) {
    return handleError(err);
  }
}
