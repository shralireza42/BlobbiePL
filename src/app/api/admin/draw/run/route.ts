import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/services/staff";
import { hasDatabase } from "@/lib/prisma";
import { forceSettleCurrent } from "@/lib/services/draw-engine";
import { isMockMode } from "@/lib/contracts";

export async function POST() {
  try {
    await requirePermission("RUN_DRAW");
    if (!hasDatabase) return fail("Database not configured.", 503);
    const result = await forceSettleCurrent(isMockMode());
    return result.ok ? ok(result) : fail(result.message, 409);
  } catch (err) {
    return handleError(err);
  }
}
