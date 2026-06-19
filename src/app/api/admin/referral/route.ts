import { z } from "zod";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/services/staff";
import { claimReferral } from "@/lib/services/referral";
import { addressSchema } from "@/lib/validation";

const schema = z.object({
  referrer: addressSchema,
  referee: addressSchema,
});

/** Admin manually credits a referral (referee → referrer). */
export async function POST(req: Request) {
  try {
    await requirePermission("MANAGE_ROLES");
    const { referrer, referee } = schema.parse(await req.json());
    const res = await claimReferral(referee, "ADMIN", "admin", referrer);
    return res.ok ? ok(res) : fail(res.message, 409);
  } catch (err) {
    return handleError(err);
  }
}
