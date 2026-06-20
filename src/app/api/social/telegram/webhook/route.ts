import { NextResponse } from "next/server";
import { socialConfig, telegramConfigured } from "@/lib/social/config";
import {
  sendTelegramMessage,
  getChatMemberStatus,
} from "@/lib/social/telegram";
import {
  getOrCreateUser,
  linkSocialAccount,
  confirmSocialTask,
} from "@/lib/services/social";
import {
  peekTelegramLinkToken,
  markTelegramLinkTokenUsed,
} from "@/lib/services/telegram-link";

export const dynamic = "force-dynamic";

type TgUpdate = {
  message?: {
    text?: string;
    from?: { id: number; username?: string; first_name?: string };
    chat?: { id: number };
  };
};

function short(wallet: string) {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

/** Display handle for the channel users must join (from chatId or channel URL). */
function channelHandle(): string {
  const { chatId, channelUrl } = socialConfig.telegram;
  if (chatId.startsWith("@")) return chatId;
  if (channelUrl) {
    const m = channelUrl.match(/t\.me\/(?:s\/)?([A-Za-z0-9_]+)/);
    if (m) return `@${m[1]}`;
    return channelUrl;
  }
  return "our channel";
}

function joinPrompt(): string {
  const handle = channelHandle();
  const link = handle.startsWith("@")
    ? `https://t.me/${handle.slice(1)}`
    : socialConfig.telegram.channelUrl || handle;
  return `🔒 To link your wallet you must first join ${handle}.\n\n1) Join: ${link}\n2) Then tap Start again (reopen the link from the Airdrop Hub).`;
}

/**
 * Telegram bot webhook (deep-link `/start <code>` flow).
 *
 * Anti-cheat: the user MUST already be a member of the channel before the bot
 * links their account. We check membership BEFORE consuming the token, so if
 * they aren't a member yet the same link keeps working after they join.
 *
 * Always returns 200 so Telegram doesn't retry indefinitely.
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  try {
    const update = (await req.json()) as TgUpdate;
    const msg = update.message;
    const text = msg?.text?.trim() ?? "";
    const chatId = msg?.chat?.id;
    const from = msg?.from;

    if (!chatId || !from?.id || !text.startsWith("/start")) {
      return NextResponse.json({ ok: true });
    }

    const code = text.split(/\s+/)[1] ?? "";
    if (!code) {
      await sendTelegramMessage(
        chatId,
        "Welcome to Blobbie! Open the Airdrop Hub and tap “Connect Telegram” to link your wallet.",
      );
      return NextResponse.json({ ok: true });
    }

    if (!telegramConfigured()) {
      await sendTelegramMessage(chatId, "Telegram verification is temporarily unavailable.");
      return NextResponse.json({ ok: true });
    }

    // Validate the link first (without consuming it).
    const wallet = await peekTelegramLinkToken(code);
    if (!wallet) {
      await sendTelegramMessage(
        chatId,
        "This connect link has expired. Go back to the Airdrop Hub and tap “Connect Telegram” again.",
      );
      return NextResponse.json({ ok: true });
    }

    // Gate: require channel membership BEFORE linking (anti-cheat).
    const membership = await getChatMemberStatus(from.id);
    if (!membership.available) {
      await sendTelegramMessage(
        chatId,
        "Couldn't check channel membership right now. Please try again in a moment.",
      );
      return NextResponse.json({ ok: true });
    }
    if (!membership.member) {
      // Do NOT consume the token — let them join and tap Start again.
      await sendTelegramMessage(chatId, joinPrompt());
      return NextResponse.json({ ok: true });
    }

    // Member confirmed → consume token, link account, and award the task.
    await markTelegramLinkTokenUsed(code);
    const user = await getOrCreateUser(wallet);
    const link = await linkSocialAccount({
      userId: user.id,
      provider: "TELEGRAM",
      providerUserId: String(from.id),
      username: from.username ?? null,
    });
    if (!link.ok) {
      await sendTelegramMessage(
        chatId,
        link.reason ?? "This Telegram account is already linked to another wallet.",
      );
      return NextResponse.json({ ok: true });
    }

    const confirm = await confirmSocialTask(
      wallet,
      "JOIN_TELEGRAM",
      "Telegram join verified.",
    );
    const points = confirm.status === "confirmed" ? confirm.points : 0;
    await sendTelegramMessage(
      chatId,
      `✅ Verified! Wallet ${short(wallet)} linked and your Telegram task is complete${
        points ? ` (+${points} Airdrop Points)` : ""
      }. You can return to the Airdrop Hub.`,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
