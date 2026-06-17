import "server-only";
import { prisma, hasDatabase } from "../prisma";

export type ChatMessageView = {
  id: string;
  wallet: string;
  body: string;
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

  if (hasDatabase) {
    try {
      const row = await prisma.chatMessage.create({
        data: { wallet: lowered, body: clean },
      });
      return {
        id: row.id,
        wallet: row.wallet,
        body: row.body,
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
