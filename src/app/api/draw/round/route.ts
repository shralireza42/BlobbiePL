import { ok, fail, handleError } from "@/lib/api";
import { getDrawProvider } from "@/lib/contracts";
import { getRoundWinners } from "@/lib/services/draw";

export const dynamic = "force-dynamic";

/**
 * Look up a single round by id for the public Verify page: round info + winners.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("roundId");
    const roundId = Number(raw);
    if (!raw || !Number.isInteger(roundId) || roundId < 1) {
      return fail("Provide a valid round number.", 422);
    }

    const provider = getDrawProvider();
    const current = await provider.getCurrentRound();
    if (roundId > current.roundNumber) {
      return fail(`Round #${roundId} has not started yet.`, 404);
    }

    const round = await provider.getRoundInfo(roundId);
    if (!round) return fail(`Round #${roundId} not found.`, 404);

    const winners = await getRoundWinners(roundId);

    return ok({
      round,
      winners,
      isCurrent: roundId === current.roundNumber,
      latestRound: current.roundNumber,
    });
  } catch (err) {
    return handleError(err);
  }
}
