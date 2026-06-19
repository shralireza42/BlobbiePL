import "server-only";
import { prisma, hasDatabase } from "../prisma";
import { levelFromPoints, mockLevelFromWallet } from "../levels";
import { isAdminWallet } from "../env";
import type { StaffRole } from "../permissions";

export type ChatMessageView = {
  id: string;
  wallet: string;
  body: string;
  level: number;
  role: StaffRole | null;
  name: string | null;
  createdAt: number;
};

const MAX_MESSAGES = 100;

/**
 * In-memory fallback store used when no database is configured (Beta Mock
 * Mode). Persists for the lifetime of the server instance — fine for the beta.
 */
const globalForChat = globalThis as unknown as {
  chatBuffer?: ChatMessageView[];
};
const buffer = (globalForChat.chatBuffer ??= []);

/** Resolve a wallet's current Blobbie level (owner=10, override, then points). */
export async function resolveLevel(wallet: string): Promise<number> {
  const lowered = wallet.toLowerCase();
  if (isAdminWallet(lowered)) return 10;
  if (hasDatabase) {
    try {
      const [airdropUser, user] = await Promise.all([
        prisma.airdropUser.findFirst({
          where: { wallet: lowered },
          orderBy: { totalPoints: "desc" },
          select: { totalPoints: true },
        }),
        prisma.user.findUnique({
          where: { wallet: lowered },
          select: { levelOverride: true },
        }),
      ]);
      if (user?.levelOverride != null) return user.levelOverride;
      return levelFromPoints(airdropUser?.totalPoints ?? 0);
    } catch {
      // fall through to mock
    }
  }
  return mockLevelFromWallet(lowered);
}

/** Resolve staff roles for a set of wallets (env owners → OWNER). */
async function rolesFor(wallets: string[]): Promise<Map<string, StaffRole>> {
  const map = new Map<string, StaffRole>();
  const lowered = [...new Set(wallets.map((w) => w.toLowerCase()))];
  for (const w of lowered) if (isAdminWallet(w)) map.set(w, "OWNER");
  if (hasDatabase && lowered.length) {
    try {
      const staff = await prisma.staff.findMany({
        where: { wallet: { in: lowered } },
        select: { wallet: true, role: true },
      });
      for (const s of staff) if (!map.has(s.wallet)) map.set(s.wallet, s.role as StaffRole);
    } catch {
      /* ignore */
    }
  }
  return map;
}

export async function getMessages(limit = 50): Promise<ChatMessageView[]> {
  if (hasDatabase) {
    try {
      const rows = await prisma.chatMessage.findMany({
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      const [roles, names] = await Promise.all([
        rolesFor(rows.map((r) => r.wallet)),
        namesFor(rows.map((r) => r.wallet)),
      ]);
      return rows
        .map((r) => ({
          id: r.id,
          wallet: r.wallet,
          body: r.body,
          level: r.level,
          role: roles.get(r.wallet.toLowerCase()) ?? null,
          name: names.get(r.wallet.toLowerCase()) ?? null,
          createdAt: r.createdAt.getTime(),
        }))
        .reverse();
    } catch {
      // fall through to in-memory
    }
  }
  const roles = await rolesFor(buffer.map((m) => m.wallet));
  return buffer
    .slice(-limit)
    .map((m) => ({ ...m, role: roles.get(m.wallet.toLowerCase()) ?? null }));
}

/** Resolve display names for a set of wallets. */
async function namesFor(wallets: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!hasDatabase || wallets.length === 0) return map;
  try {
    const lowered = [...new Set(wallets.map((w) => w.toLowerCase()))];
    const users = await prisma.user.findMany({
      where: { wallet: { in: lowered }, displayName: { not: null } },
      select: { wallet: true, displayName: true },
    });
    for (const u of users) if (u.displayName) map.set(u.wallet, u.displayName);
  } catch {
    /* ignore */
  }
  return map;
}

export async function addMessage(
  wallet: string,
  body: string,
): Promise<ChatMessageView> {
  const clean = sanitize(body);
  const lowered = wallet.toLowerCase();
  const level = await resolveLevel(lowered);

  if (hasDatabase) {
    try {
      const row = await prisma.chatMessage.create({
        data: { wallet: lowered, body: clean, level },
      });
      return {
        id: row.id,
        wallet: row.wallet,
        body: row.body,
        level: row.level,
        role: null,
        name: null,
        createdAt: row.createdAt.getTime(),
      };
    } catch {
      // fall through to in-memory
    }
  }

  const msg: ChatMessageView = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    wallet: lowered,
    body: clean,
    level,
    role: null,
    name: null,
    createdAt: Date.now(),
  };
  buffer.push(msg);
  if (buffer.length > MAX_MESSAGES) buffer.splice(0, buffer.length - MAX_MESSAGES);
  return msg;
}

/** Strip control chars and collapse whitespace. React escapes the rest. */
function sanitize(body: string): string {
  // eslint-disable-next-line no-control-regex
  return body.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 280);
}
