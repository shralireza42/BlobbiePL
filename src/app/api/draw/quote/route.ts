import { ok, handleError, fail } from "@/lib/api";
import { getDrawProvider } from "@/lib/contracts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const count = Number(url.searchParams.get("ticketCount") ?? "1");
    if (!Number.isFinite(count) || count < 1) {
      return fail("Invalid ticket count", 422);
    }
    const quote = await getDrawProvider().quoteTickets(count);
    return ok({
      ticketCount: Math.floor(count),
      blobbieWei: quote.blobbieWei.toString(),
      usd: quote.usd,
      priceUsd: quote.priceUsd,
      isMockPrice: quote.isMockPrice,
    });
  } catch (err) {
    return handleError(err);
  }
}
