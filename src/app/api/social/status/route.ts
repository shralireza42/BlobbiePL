import { ok, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getSocialStatus } from "@/lib/services/social";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    const status = await getSocialStatus(session?.wallet ?? null);
    return ok(status);
  } catch (err) {
    return handleError(err);
  }
}
