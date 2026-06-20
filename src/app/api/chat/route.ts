import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { chatMessageSchema } from "@/lib/validation";
import { getSession } from "@/lib/auth";
import { getMessages, addMessage } from "@/lib/services/chat";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { isChatBlocked, createSanction } from "@/lib/services/moderation";
import { checkSpam, SPAM_PENALTY_MINUTES } from "@/lib/services/chat-antispam";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = await getMessages(50);
    return ok({ messages });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Connect and verify your wallet to chat.", 401);

    const rl = rateLimit(session.wallet, {
      limit: 15,
      windowMs: 60_000,
      bucket: "chat-send",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    const blocked = await isChatBlocked(session.wallet);
    if (blocked.blocked) return fail(blocked.reason ?? "You can't chat right now.", 403);

    const body = await req.json();
    const { body: text } = chatMessageSchema.parse(body);

    // Anti-spam: warn → mute (15m) → ban (15m).
    const spam = checkSpam(session.wallet, text);
    if (spam.action !== "allow") {
      if (spam.action === "mute") {
        await createSanction({
          wallet: session.wallet,
          scope: "CHAT_MUTE",
          reason: "spam",
          durationMinutes: SPAM_PENALTY_MINUTES,
          createdBy: "system",
        });
      } else if (spam.action === "ban") {
        await createSanction({
          wallet: session.wallet,
          scope: "CHAT_BAN",
          reason: "spam",
          durationMinutes: SPAM_PENALTY_MINUTES,
          createdBy: "system",
        });
      }
      return fail(spam.message ?? "Please don't spam.", 429);
    }

    const message = await addMessage(session.wallet, text);
    void clientIdentifier(req);
    return ok({ message });
  } catch (err) {
    return handleError(err);
  }
}
