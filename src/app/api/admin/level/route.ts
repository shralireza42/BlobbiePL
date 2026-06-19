import { z } from "zod";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/services/staff";
import { prisma, hasDatabase } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";

const schema = z.object({
  wallet: addressSchema,
  // 0–10, or null to clear the override (back to points-based).
  level: z.number().int().min(0).max(10).nullable(),
});

export async function POST(req: Request) {
  try {
    await requirePermission("MANAGE_ROLES");
    if (!hasDatabase) return fail("Database not configured.", 503);
    const { wallet, level } = schema.parse(await req.json());
    await prisma.user.upsert({
      where: { wallet },
      update: { levelOverride: level },
      create: { wallet, levelOverride: level },
    });
    return ok({ wallet, level });
  } catch (err) {
    return handleError(err);
  }
}
