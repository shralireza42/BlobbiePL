"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";
import { WalletButton } from "./wallet-button";
import { ROUTES } from "@/lib/routes";

const NAV_LINKS = [
  { href: ROUTES.playground, label: "Playground" },
  { href: ROUTES.dailyDraw, label: "Daily Rewards Draw" },
  { href: ROUTES.airdrop, label: "Airdrop Hub" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-cream/10 bg-bg/80 backdrop-blur-xl">
      <nav className="container-px flex h-[72px] items-center justify-between gap-4">
        {/* Left: logo */}
        <Logo />

        {/* Center: primary nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-pill px-4 py-2 text-sm font-bold not-italic transition ${
                  active
                    ? "bg-cream/10 text-cream"
                    : "text-cream-dim hover:text-cream"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right: Dashboard + wallet */}
        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.dashboard}
            className={`hidden rounded-pill px-4 py-2 text-sm font-bold not-italic transition sm:inline-flex ${
              pathname === ROUTES.dashboard
                ? "bg-cream/10 text-cream"
                : "text-cream-dim hover:text-cream"
            }`}
          >
            Dashboard
          </Link>
          <WalletButton />
          <button
            className="btn-ghost px-3 py-2 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-cream/10 bg-bg-soft md:hidden">
          <div className="container-px flex flex-col py-2">
            {[...NAV_LINKS, { href: ROUTES.dashboard, label: "Dashboard" }].map(
              (link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm not-italic text-cream-soft hover:bg-cream/5"
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>
        </div>
      )}
    </header>
  );
}
