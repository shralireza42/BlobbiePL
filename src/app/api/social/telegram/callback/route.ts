import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import {
  verifyTelegramJoin,
  parseTelegramQuery,
} from "@/lib/services/social-verify";

export const dynamic = "force-dynamic";

/**
 * Redirect-based Telegram Login callback. The Login Widget (data-auth-url) sends
 * the user here with signed query params after they authorize in Telegram. This
 * is more reliable than the popup `onauth` flow (works on mobile + avoids the
 * "stuck after redirect" issue). We verify, award, then bounce back to /airdrop.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (status: string, msg?: string) => {
    const target = new URL(ROUTES.airdrop, url.origin);
    target.searchParams.set("tg", status);
    if (msg) target.searchParams.set("tgmsg", msg);
    return NextResponse.redirect(target);
  };

  try {
    const session = getSession();
    if (!session?.wallet) {
      return back("error", "Connect and verify your wallet first, then link Telegram.");
    }

    const authData = parseTelegramQuery(url.searchParams);
    if (!authData) {
      return back("error", "Missing Telegram login data. Please try again.");
    }

    const result = await verifyTelegramJoin(session.wallet, authData);
    return back(result.status === "confirmed" ? "confirmed" : "failed", result.message);
  } catch {
    return back("error", "Something went wrong verifying Telegram. Try again.");
  }
}
