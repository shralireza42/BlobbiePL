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
  { href: ROUTES.dashboard, label: "Dashboard" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/70 backdrop-blur-xl">
      <nav className="container-px flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="border-t border-white/10 bg-bg-soft md:hidden">
          <div className="container-px flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm text-slate-200 hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
