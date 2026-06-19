import "server-only";
import { prisma, hasDatabase } from "../prisma";

export type SanctionScope = "SITE_BAN" | "CHAT_BAN" | "CHAT_MUTE";

function activeWhere(wallet: string) {
  return {
    wallet: wallet.toLowerCase(),
    liftedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
}

export async function createSanction(args: {
  wallet: string;
  scope: SanctionScope;
  reason?: string;
  durationMinutes?: number | null; // null/undefined => permanent
  createdBy: string;
}): Promise<{ ok: boolean }> {
  if (!hasDatabase) return { ok: false };
  const expiresAt =
    args.durationMinutes && args.durationMinutes > 0
      ? new Date(Date.now() + args.durationMinutes * 60_000)
      : null;
  await prisma.sanction.create({
    data: {
      wallet: args.wallet.toLowerCase(),
      scope: args.scope,
      reason: args.reason,
      expiresAt,
      createdBy: args.createdBy.toLowerCase(),
    },
  });
  return { ok: true };
}

/** Lift all active sanctions of a scope (or all scopes) for a wallet. */
export async function liftSanction(args: {
  wallet: string;
  scope?: SanctionScope;
}): Promise<{ ok: boolean }> {
  if (!hasDatabase) return { ok: false };
  await prisma.sanction.updateMany({
    where: {
      wallet: args.wallet.toLowerCase(),
      liftedAt: null,
      ...(args.scope ? { scope: args.scope } : {}),
    },
    data: { liftedAt: new Date() },
  });
  return { ok: true };
}

export async function getActiveSanctions(wallet: string) {
  if (!hasDatabase) return [];
  try {
    return await prisma.sanction.findMany({ where: activeWhere(wallet) });
  } catch {
    return [];
  }
}

export async function isSiteBanned(wallet: string): Promise<boolean> {
  if (!hasDatabase) return false;
  try {
    const n = await prisma.sanction.count({
      where: { ...activeWhere(wallet), scope: "SITE_BAN" },
    });
    return n > 0;
  } catch {
    return false;
  }
}

/** Blocked from chatting (muted, chat-banned, or site-banned). */
export async function isChatBlocked(
  wallet: string,
): Promise<{ blocked: boolean; reason?: string }> {
  if (!hasDatabase) return { blocked: false };
  try {
    const sanctions = await prisma.sanction.findMany({
      where: {
        ...activeWhere(wallet),
        scope: { in: ["SITE_BAN", "CHAT_BAN", "CHAT_MUTE"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (sanctions.length === 0) return { blocked: false };
    const s = sanctions[0];
    const label =
      s.scope === "CHAT_MUTE" ? "muted" : s.scope === "CHAT_BAN" ? "banned from chat" : "banned";
    const until = s.expiresAt ? ` until ${s.expiresAt.toISOString()}` : "";
    return { blocked: true, reason: `You are ${label}${until}.` };
  } catch {
    return { blocked: false };
  }
}

export async function listSanctions(limit = 100) {
  if (!hasDatabase) return [];
  try {
    return await prisma.sanction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function deleteChatMessage(messageId: string, byWallet: string) {
  if (!hasDatabase) return { ok: false };
  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { deleted: true, deletedBy: byWallet.toLowerCase() },
  });
  return { ok: true };
}
