import { z } from "zod";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission, setStaffRole, removeStaff } from "@/lib/services/staff";
import { addressSchema } from "@/lib/validation";

const schema = z.object({
  action: z.enum(["set", "remove"]),
  wallet: addressSchema,
  role: z.enum(["MANAGER", "MODERATOR", "SENIOR"]).optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await requirePermission("MANAGE_ROLES");
    const input = schema.parse(await req.json());

    if (input.action === "remove") {
      const res = await removeStaff({ actorWallet: admin.wallet, targetWallet: input.wallet });
      return res.ok ? ok({ done: true }) : fail(res.reason ?? "Failed", 403);
    }

    if (!input.role) return fail("role required", 422);
    const res = await setStaffRole({
      actorWallet: admin.wallet,
      targetWallet: input.wallet,
      role: input.role,
    });
    return res.ok ? ok({ done: true }) : fail(res.reason ?? "Failed", 403);
  } catch (err) {
    return handleError(err);
  }
}
