import "server-only";
import { prisma, hasDatabase } from "../prisma";
import { levelFromPoints, mockLevelFromWallet } from "../levels";

export type ChatMessageView = {
  id: string;
  wallet: string;
  body: string;
  level: number;
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

/** Resolve a wallet's current Blobbie level (points-based, mock fallback). */
export async function resolveLevel(wallet: string): Promise<number> {
  const lowered = wallet.toLowerCase();
  if (hasDatabase) {
    try {
      const airdropUser = await prisma.airdropUser.findFirst({
        where: { wallet: lowered },
        orderBy: { totalPoints: "desc" },
        select: { totalPoints: true },
      });
      return levelFromPoints(airdropUser?.totalPoints ?? 0);
    } catch {
      // fall through to mock
    }
  }
  return mockLevelFromWallet(lowered);
}

export async function getMessages(limit = 50): Promise<ChatMessageView[]> {
  if (hasDatabase) {
    try {
      const rows = await prisma.chatMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows
        .map((r) => ({
          id: r.id,
          wallet: r.wallet,
          body: r.body,
          level: r.level,
          createdAt: r.createdAt.getTime(),
        }))
        .reverse();
    } catch {
      // fall through to in-memory
    }
  }
  return buffer.slice(-limit);
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
