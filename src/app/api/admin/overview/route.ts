import { ok, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireAdmin();
    const overview = await getAdminOverview();
    return ok(overview);
  } catch (err) {
    return handleError(err);
  }
}
