import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { buyTicketsSchema } from "@/lib/validation";
import { getSession } from "@/lib/auth";
import { getDrawProvider, isMockMode } from "@/lib/contracts";
import { recordEntry } from "@/lib/services/draw";
import { claimTask } from "@/lib/services/airdrop";
import { isSiteBanned } from "@/lib/services/moderation";
import { getFeatures } from "@/lib/services/features";
import { config } from "@/lib/config";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);

    const rl = rateLimit(session.wallet, {
      limit: 10,
      windowMs: 60_000,
      bucket: "draw-buy",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    if (await isSiteBanned(session.wallet)) {
      return fail("Your account is banned from the site.", 403);
    }

    const features = await getFeatures();
    if (!features.drawEnabled) {
      return fail("The Daily Rewards Draw is temporarily paused.", 403);
    }
    if (!config.ticketPurchaseEnabled || !features.ticketPurchaseEnabled) {
      return fail("Ticket purchase is currently disabled.", 403);
    }

    const body = await req.json();
    const input = buyTicketsSchema.parse(body);

    const mock = isMockMode();

    // In mock mode we must NOT accept a real tx hash claim.
    if (mock && input.txHash) {
      return fail("Mock mode cannot accept transaction hashes.", 400);
    }

    const provider = getDrawProvider();

    // Persist the entry first (validates the round is open / not in cooldown).
    const entry = await recordEntry({
      wallet: session.wallet,
      ticketCount: input.ticketCount,
      txHash: mock ? null : input.txHash ?? null,
      mockMode: mock,
    });

    if (entry.recorded === false) {
      return fail(entry.message ?? "The draw is closed right now.", 409);
    }

    const tx = await provider.buyTickets(input.ticketCount, session.wallet as `0x${string}`);

    // Daily Draw participation generates airdrop points (server-side only).
    let airdrop: { awarded: number } | null = null;
    try {
      const res = await claimTask(session.wallet, "buy_ticket");
      if (res.ok) airdrop = { awarded: res.awarded };
    } catch {
      // non-fatal
    }

    void clientIdentifier(req);

    return ok({
      tx,
      entry,
      airdrop,
      isMockMode: mock,
    });
  } catch (err) {
    return handleError(err);
  }
}
