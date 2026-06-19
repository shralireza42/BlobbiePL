import { ok, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    return ok({
      authenticated: !!session,
      wallet: session?.wallet ?? null,
      isAdmin: session?.isAdmin ?? false,
    });
  } catch (err) {
    return handleError(err);
  }
}
