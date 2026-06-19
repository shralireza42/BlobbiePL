"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";
import { WalletButton } from "./wallet-button";
import { ROUTES } from "@/lib/routes";

const NAV_LINKS = [
  { href: ROUTES.dailyDraw, label: "Daily Draw" },
  { href: ROUTES.airdrop, label: "Airdrop Hub" },
  { href: ROUTES.verify, label: "Verify" },
];

const SOCIALS = [
  { label: "Discord", href: "https://discord.com/invite/FVKsFSWMq6", icon: DiscordIcon },
  { label: "Telegram", href: "https://t.me/itsBlobbie", icon: TelegramIcon },
  { label: "X", href: "https://x.com/xBlobbie", icon: XIcon },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-3 rounded-3xl border-2 border-ink bg-paper px-4 shadow-sticker sm:px-6">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-6">
          <Logo tone="ink" size={56} />
          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-pill px-3 py-2 text-sm font-extrabold not-italic transition ${
                    active
                      ? "bg-ink text-paper"
                      : "text-ink/70 hover:text-ink"
                  }`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: socials + Dashboard + wallet */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 md:flex">
            {SOCIALS.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-12 w-12 items-center justify-center rounded-full text-ink transition hover:bg-ink/10"
              >
                <Icon />
              </a>
            ))}
          </div>
          <Link
            href={ROUTES.dashboard}
            className={`hidden rounded-pill px-3 py-2 text-sm font-extrabold not-italic transition sm:inline-flex ${
              pathname === ROUTES.dashboard
                ? "bg-ink text-paper"
                : "text-ink/70 hover:text-ink"
            }`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dashboard
          </Link>
          <WalletButton />
          <button
            className="btn-ink h-10 w-10 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span className="text-lg leading-none">{open ? "✕" : "≡"}</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="mx-auto mt-2 w-full max-w-6xl rounded-3xl border-2 border-ink bg-paper p-2 shadow-sticker lg:hidden">
          {[...NAV_LINKS, { href: ROUTES.dashboard, label: "Dashboard" }].map(
            (link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-extrabold not-italic text-ink hover:bg-ink/10"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {link.label}
              </Link>
            ),
          )}
        </div>
      )}
    </header>
  );
}

function DiscordIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.5 5.3A16 16 0 0 0 15.6 4l-.2.4a12 12 0 0 1 3.4 1.7 11 11 0 0 0-9.6 0A12 12 0 0 1 12.6 4l-.2-.4A16 16 0 0 0 4.5 5.3 16.5 16.5 0 0 0 2 16.4a16 16 0 0 0 4.9 2.5l.4-.6a10 10 0 0 1-1.6-.8l.4-.3a11.5 11.5 0 0 0 9.8 0l.4.3a10 10 0 0 1-1.6.8l.4.6A16 16 0 0 0 22 16.4a16.5 16.5 0 0 0-2.5-11.1ZM9 14c-.8 0-1.4-.7-1.4-1.6S8.2 10.8 9 10.8s1.4.7 1.4 1.6S9.8 14 9 14Zm6 0c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6 1.4.7 1.4 1.6S15.8 14 15 14Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.9 4.3 18.6 20c-.2 1-.9 1.3-1.8.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.4 13.3l-4.7-1.5c-1-.3-1-1 .2-1.5l18.4-7.1c.9-.3 1.6.2 1.6 1.1Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.2 2H21l-6.6 7.5L22 22h-6.2l-4.8-6.3L5.5 22H2.7l7-8L2 2h6.3l4.4 5.8L18.2 2Zm-2.2 18h1.7L7.9 3.8H6.1L16 20Z" />
    </svg>
  );
}
