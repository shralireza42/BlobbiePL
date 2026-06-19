import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/services/staff";
import { adminReviewSchema } from "@/lib/validation";
import { reviewAirdropUser } from "@/lib/services/admin";

export async function POST(req: Request) {
  try {
    const admin = await requirePermission("REVIEW_AIRDROP");
    const body = await req.json();
    const input = adminReviewSchema.parse(body);
    await reviewAirdropUser(input, admin.wallet);
    return ok({ reviewed: true });
  } catch (err) {
    return handleError(err);
  }
}
