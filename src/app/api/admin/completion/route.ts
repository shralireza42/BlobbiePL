import { ok, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminCompletionReviewSchema } from "@/lib/validation";
import { reviewCompletion } from "@/lib/services/admin";

export async function POST(req: Request) {
  try {
    const admin = requireAdmin();
    const body = await req.json();
    const input = adminCompletionReviewSchema.parse(body);
    const result = await reviewCompletion(input, admin.wallet);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
