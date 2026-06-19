import { ok, handleError } from "@/lib/api";
import { getLeaderboard } from "@/lib/services/airdrop";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leaderboard = await getLeaderboard(50);
    return ok({ leaderboard });
  } catch (err) {
    return handleError(err);
  }
}
