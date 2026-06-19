import { ok, fail, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma, hasDatabase } from "@/lib/prisma";
import { levelInfoFromPoints, mockLevelFromWallet, LEVEL_THRESHOLDS } from "@/lib/levels";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);

    const wallet = session.wallet.toLowerCase();

    if (hasDatabase) {
      try {
        const airdropUser = await prisma.airdropUser.findFirst({
          where: { wallet },
          orderBy: { totalPoints: "desc" },
          select: { totalPoints: true },
        });
        const info = levelInfoFromPoints(airdropUser?.totalPoints ?? 0);
        return ok({ ...info, isMock: false });
      } catch {
        // fall through to mock
      }
    }

    // Beta Mock Mode — deterministic level so the character is visible.
    const level = mockLevelFromWallet(wallet);
    const info = levelInfoFromPoints(LEVEL_THRESHOLDS[level]);
    return ok({ ...info, isMock: true });
  } catch (err) {
    return handleError(err);
  }
}
