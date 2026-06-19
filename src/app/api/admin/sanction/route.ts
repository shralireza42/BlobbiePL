import { z } from "zod";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/services/staff";
import { createSanction, liftSanction } from "@/lib/services/moderation";
import { addressSchema } from "@/lib/validation";

const schema = z.object({
  action: z.enum(["create", "lift"]),
  wallet: addressSchema,
  scope: z.enum(["SITE_BAN", "CHAT_BAN", "CHAT_MUTE"]),
  reason: z.string().max(300).optional(),
  durationMinutes: z.number().int().positive().max(525600).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    // SITE_BAN needs SITE_BAN permission; chat sanctions need CHAT_MODERATE.
    const input = schema.parse(await req.json());
    const admin = await requirePermission(
      input.scope === "SITE_BAN" ? "SITE_BAN" : "CHAT_MODERATE",
    );

    if (input.action === "lift") {
      await liftSanction({ wallet: input.wallet, scope: input.scope });
      return ok({ done: true });
    }

    await createSanction({
      wallet: input.wallet,
      scope: input.scope,
      reason: input.reason,
      durationMinutes: input.durationMinutes ?? null,
      createdBy: admin.wallet,
    });
    return ok({ done: true });
  } catch (err) {
    return handleError(err);
  }
}
