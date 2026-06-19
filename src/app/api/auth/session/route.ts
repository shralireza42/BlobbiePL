import { ok, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getActor } from "@/lib/services/staff";
import { getActiveSanctions } from "@/lib/services/moderation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return ok({
        authenticated: false,
        wallet: null,
        isAdmin: false,
        role: null,
        permissions: [],
        sanctions: { siteBanned: false, chatBlocked: false },
      });
    }

    const actor = await getActor(session.wallet);
    const sanctions = await getActiveSanctions(session.wallet);
    const siteBanned = sanctions.some((s) => s.scope === "SITE_BAN");
    const chatBlocked = sanctions.some((s) =>
      ["SITE_BAN", "CHAT_BAN", "CHAT_MUTE"].includes(s.scope),
    );

    return ok({
      authenticated: true,
      wallet: session.wallet,
      isAdmin: !!actor?.isStaff,
      role: actor?.role ?? null,
      permissions: actor?.permissions ?? [],
      sanctions: { siteBanned, chatBlocked },
    });
  } catch (err) {
    return handleError(err);
  }
}
