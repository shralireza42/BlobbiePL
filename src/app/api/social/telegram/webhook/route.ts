import { NextResponse } from "next/server";
import { socialConfig } from "@/lib/social/config";
import { sendTelegramMessage } from "@/lib/social/telegram";
import { getOrCreateUser, linkSocialAccount } from "@/lib/services/social";
import { consumeTelegramLinkToken } from "@/lib/services/telegram-link";

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

/**
 * Telegram bot webhook. The deep-link flow sends `/start <code>` here when a
 * user taps Start; we link their Telegram account to the wallet bound to that
 * code. Optionally protected by a secret token (TELEGRAM_WEBHOOK_SECRET).
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

    const wallet = await consumeTelegramLinkToken(code);
    if (!wallet) {
      await sendTelegramMessage(
        chatId,
        "This connect link has expired. Go back to the Airdrop Hub and tap “Connect Telegram” again.",
      );
      return NextResponse.json({ ok: true });
    }

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
        link.reason ??
          "This Telegram account is already linked to another wallet.",
      );
      return NextResponse.json({ ok: true });
    }

    const channel = socialConfig.telegram.channelUrl
      ? ` Now join ${socialConfig.telegram.channelUrl} and`
      : " Now join our channel and";
    await sendTelegramMessage(
      chatId,
      `✅ Telegram connected to wallet ${short(wallet)}.${channel} return to the Airdrop Hub to tap “Verify”.`,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
