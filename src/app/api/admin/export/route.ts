import { handleError, fail } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { exportCsv } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    requireAdmin();
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") ?? "users";
    if (!["users", "airdrop", "draw"].includes(kind)) {
      return fail("Invalid export kind", 422);
    }
    const csv = await exportCsv(kind as "users" | "airdrop" | "draw");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="blobbie-${kind}.csv"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
