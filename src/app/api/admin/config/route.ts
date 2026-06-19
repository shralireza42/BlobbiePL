import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/services/staff";
import { adminConfigSchema } from "@/lib/validation";
import { setAppConfig } from "@/lib/services/admin";

export async function POST(req: Request) {
  try {
    const admin = await requirePermission("MANAGE_CONFIG");
    const body = await req.json();
    const input = adminConfigSchema.parse(body);
    await setAppConfig(input, admin.wallet);
    return ok({ saved: true });
  } catch (err) {
    return handleError(err);
  }
}
