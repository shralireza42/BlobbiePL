"use client";

import { useEffect, useRef } from "react";

/**
 * Telegram Login Widget. Renders when a bot username is provided (from
 * /api/social/status). On successful login it calls onAuth with the signed
 * payload, which the server verifies (hash + group membership) before awarding.
 */
declare global {
  interface Window {
    __blobbieTgAuth?: (user: Record<string, unknown>) => void;
  }
}

export function TelegramVerify({
  botUsername,
  onAuth,
}: {
  botUsername: string;
  onAuth: (data: Record<string, unknown>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!botUsername || !ref.current) return;
    window.__blobbieTgAuth = (user) => onAuth(user);
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-onauth", "__blobbieTgAuth(user)");
    script.setAttribute("data-request-access", "write");
    ref.current.innerHTML = "";
    ref.current.appendChild(script);
  }, [botUsername, onAuth]);

  if (!botUsername) return null;
  return <div ref={ref} className="inline-block" />;
}
