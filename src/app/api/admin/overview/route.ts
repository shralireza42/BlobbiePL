import { ok, handleError } from "@/lib/api";
import { requireStaff } from "@/lib/services/staff";
import { getAdminOverview } from "@/lib/services/admin";
import { grantableRoles } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireStaff();
    const overview = await getAdminOverview();
    return ok({
      ...overview,
      me: {
        wallet: actor.wallet,
        role: actor.role,
        permissions: actor.permissions,
        grantableRoles: grantableRoles(actor.role),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
