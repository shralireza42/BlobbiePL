import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/services/staff";
import { fraudFlagSchema } from "@/lib/validation";
import { flagWallet } from "@/lib/services/admin";

export async function POST(req: Request) {
  try {
    const admin = await requirePermission("FLAG_FRAUD");
    const body = await req.json();
    const input = fraudFlagSchema.parse(body);
    await flagWallet(input, admin.wallet);
    return ok({ flagged: true });
  } catch (err) {
    return handleError(err);
  }
}
