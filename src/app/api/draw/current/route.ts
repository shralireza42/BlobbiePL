import { ok, handleError } from "@/lib/api";
import { getCurrentRound, getUserTicketsForCurrentRound } from "@/lib/services/draw";
import { getBlobbiePrice } from "@/lib/price";
import { getSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { isMockMode } from "@/lib/contracts";
import { computeOdds } from "@/lib/prizes";
import { ROUND_CAPACITY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [round, price] = await Promise.all([
      getCurrentRound(),
      getBlobbiePrice(),
    ]);
    const session = getSession();
    const userTickets = session?.wallet
      ? await getUserTicketsForCurrentRound(session.wallet)
      : 0;

    // Odds & winnings are always shown for a full 300-ticket round (potential),
    // regardless of how many tickets have actually sold.
    const odds = computeOdds(ROUND_CAPACITY, userTickets);

    return ok({
      round,
      price,
      userTickets,
      odds,
      isMockMode: isMockMode(),
      ticketPurchaseEnabled: config.ticketPurchaseEnabled,
      tokenConfigured: !!config.addresses.token,
    });
  } catch (err) {
    return handleError(err);
  }
}
