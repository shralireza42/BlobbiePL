import { ok, handleError } from "@/lib/api";
import { getCurrentRound, getUserTicketsForCurrentRound } from "@/lib/services/draw";
import { getBlobbiePrice } from "@/lib/price";
import { getSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { isMockMode } from "@/lib/contracts";

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

    return ok({
      round,
      price,
      userTickets,
      isMockMode: isMockMode(),
      ticketPurchaseEnabled: config.ticketPurchaseEnabled,
      tokenConfigured: !!config.addresses.token,
    });
  } catch (err) {
    return handleError(err);
  }
}
