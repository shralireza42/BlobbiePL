"use client";

import { useEffect, useRef } from "react";
import { config } from "@/lib/config";

/**
 * Telegram Login Widget. Renders only when NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is
 * configured. On successful login it calls onAuth with the signed payload,
 * which the server verifies (hash + group membership) before awarding points.
 */
declare global {
  interface Window {
    __blobbieTgAuth?: (user: Record<string, unknown>) => void;
  }
}

export function TelegramVerify({
  onAuth,
}: {
  onAuth: (data: Record<string, unknown>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config.telegramBotUsername || !ref.current) return;
    window.__blobbieTgAuth = (user) => onAuth(user);
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", config.telegramBotUsername);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-onauth", "__blobbieTgAuth(user)");
    script.setAttribute("data-request-access", "write");
    ref.current.innerHTML = "";
    ref.current.appendChild(script);
  }, [onAuth]);

  if (!config.telegramBotUsername) return null;
  return <div ref={ref} className="inline-block" />;
}

export const telegramWidgetEnabled = () => !!config.telegramBotUsername;
