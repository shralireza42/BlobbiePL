import { ok, fail, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma, hasDatabase } from "@/lib/prisma";
import { getStaffRole } from "@/lib/services/staff";
import {
  levelInfoFromPoints,
  mockLevelFromWallet,
  characterFor,
  LEVEL_TITLES,
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
} from "@/lib/levels";

export const dynamic = "force-dynamic";

function pinLevel(base: ReturnType<typeof levelInfoFromPoints>, level: number) {
  const lvl = Math.max(0, Math.min(MAX_LEVEL, level));
  return {
    ...base,
    level: lvl,
    title: LEVEL_TITLES[lvl],
    character: characterFor(lvl),
    progress: 1,
    pointsToNext: 0,
    nextThreshold: null,
  };
}

export async function GET() {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect your wallet first.", 401);

    const wallet = session.wallet.toLowerCase();

    // Owners are always level 10.
    const role = await getStaffRole(wallet);
    if (role === "OWNER") {
      return ok({ ...pinLevel(levelInfoFromPoints(0), MAX_LEVEL), isMock: false });
    }

    if (hasDatabase) {
      try {
        const [airdropUser, user] = await Promise.all([
          prisma.airdropUser.findFirst({
            where: { wallet },
            orderBy: { totalPoints: "desc" },
            select: { totalPoints: true },
          }),
          prisma.user.findUnique({
            where: { wallet },
            select: { levelOverride: true },
          }),
        ]);
        const info = levelInfoFromPoints(airdropUser?.totalPoints ?? 0);
        if (user?.levelOverride != null) {
          return ok({ ...pinLevel(info, user.levelOverride), isMock: false });
        }
        return ok({ ...info, isMock: false });
      } catch {
        // fall through to mock
      }
    }

    const level = mockLevelFromWallet(wallet);
    const info = levelInfoFromPoints(LEVEL_THRESHOLDS[level]);
    return ok({ ...info, isMock: true });
  } catch (err) {
    return handleError(err);
  }
}
