import { z } from "zod";
import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/services/staff";
import {
  deleteChatMessage,
  createSanction,
  liftSanction,
} from "@/lib/services/moderation";
import { rateLimit } from "@/lib/rate-limit";
import { addressSchema } from "@/lib/validation";

const schema = z.object({
  action: z.enum(["delete", "mute", "ban", "unmute", "unban"]),
  messageId: z.string().min(1).optional(),
  wallet: addressSchema.optional(),
  reason: z.string().max(300).optional(),
  durationMinutes: z.number().int().positive().max(525600).optional(),
});

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session?.wallet) return fail("Unauthorized", 401);

    const actor = await requirePermission("CHAT_MODERATE");

    const rl = rateLimit(actor.wallet, {
      limit: 60,
      windowMs: 60_000,
      bucket: "chat-moderate",
    });
    if (!rl.ok) return rateLimited(rl.resetAt);

    const input = schema.parse(await req.json());

    switch (input.action) {
      case "delete":
        if (!input.messageId) return fail("messageId required", 422);
        await deleteChatMessage(input.messageId, actor.wallet);
        return ok({ done: true });
      case "mute":
        if (!input.wallet) return fail("wallet required", 422);
        await createSanction({
          wallet: input.wallet,
          scope: "CHAT_MUTE",
          reason: input.reason,
          durationMinutes: input.durationMinutes ?? null,
          createdBy: actor.wallet,
        });
        return ok({ done: true });
      case "ban":
        if (!input.wallet) return fail("wallet required", 422);
        await createSanction({
          wallet: input.wallet,
          scope: "CHAT_BAN",
          reason: input.reason,
          durationMinutes: input.durationMinutes ?? null,
          createdBy: actor.wallet,
        });
        return ok({ done: true });
      case "unmute":
        if (!input.wallet) return fail("wallet required", 422);
        await liftSanction({ wallet: input.wallet, scope: "CHAT_MUTE" });
        return ok({ done: true });
      case "unban":
        if (!input.wallet) return fail("wallet required", 422);
        await liftSanction({ wallet: input.wallet, scope: "CHAT_BAN" });
        return ok({ done: true });
    }
  } catch (err) {
    return handleError(err);
  }
}
