import { ok, handleError } from "@/lib/api";
import { getRecentResults } from "@/lib/services/draw";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results = await getRecentResults(3);
    return ok({ results });
  } catch (err) {
    return handleError(err);
  }
}
