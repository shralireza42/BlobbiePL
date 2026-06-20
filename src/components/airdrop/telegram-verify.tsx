"use client";

import { useEffect, useRef } from "react";

/**
 * Telegram Login Widget.
 *
 * Two modes:
 *  - Redirect (recommended): pass `authUrl` and Telegram does a full-page
 *    redirect back to that server route with signed params. This is the most
 *    reliable flow (works on mobile, no popup, no "stuck after redirect").
 *  - Popup: omit `authUrl` and pass `onAuth` to receive the signed payload via
 *    the JS callback.
 */
declare global {
  interface Window {
    __blobbieTgAuth?: (user: Record<string, unknown>) => void;
  }
}

export function TelegramVerify({
  botUsername,
  authUrl,
  onAuth,
}: {
  botUsername: string;
  authUrl?: string;
  onAuth?: (data: Record<string, unknown>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!botUsername || !ref.current) return;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-request-access", "write");

    if (authUrl) {
      const abs = authUrl.startsWith("http")
        ? authUrl
        : `${window.location.origin}${authUrl}`;
      script.setAttribute("data-auth-url", abs);
    } else if (onAuth) {
      window.__blobbieTgAuth = (user) => onAuth(user);
      script.setAttribute("data-onauth", "__blobbieTgAuth(user)");
    }

    ref.current.innerHTML = "";
    ref.current.appendChild(script);
  }, [botUsername, authUrl, onAuth]);

  if (!botUsername) return null;
  return <div ref={ref} className="inline-block" />;
}
