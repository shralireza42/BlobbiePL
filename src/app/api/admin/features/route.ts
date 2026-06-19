import { z } from "zod";
import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/services/staff";
import { setFeature } from "@/lib/services/features";

const schema = z.object({
  feature: z.enum([
    "drawEnabled",
    "airdropEnabled",
    "minigamesEnabled",
    "ticketPurchaseEnabled",
  ]),
  enabled: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const admin = await requirePermission("MANAGE_FEATURES");
    const { feature, enabled } = schema.parse(await req.json());
    await setFeature(feature, enabled, admin.wallet);
    return ok({ feature, enabled });
  } catch (err) {
    return handleError(err);
  }
}
