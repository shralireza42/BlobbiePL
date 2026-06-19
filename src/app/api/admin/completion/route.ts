import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/services/staff";
import { adminCompletionReviewSchema } from "@/lib/validation";
import { reviewCompletion } from "@/lib/services/admin";

export async function POST(req: Request) {
  try {
    const admin = await requirePermission("REVIEW_AIRDROP");
    const body = await req.json();
    const input = adminCompletionReviewSchema.parse(body);
    const result = await reviewCompletion(input, admin.wallet);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
