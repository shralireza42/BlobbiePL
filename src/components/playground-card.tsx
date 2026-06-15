import Link from "next/link";
import { ActiveBadge, ComingSoonBadge } from "./ui";
import type { PlaygroundCard as CardType } from "@/lib/routes";

const ACCENTS: Record<CardType["accent"], string> = {
  cyan: "from-neon-cyan/20 to-neon-blue/5 text-neon-cyan",
  purple: "from-neon-purple/20 to-neon-violet/5 text-neon-purple",
  blue: "from-neon-blue/20 to-neon-cyan/5 text-neon-blue",
  pink: "from-neon-pink/20 to-neon-purple/5 text-neon-pink",
};

const GLYPHS: Record<string, string> = {
  draw: "◎",
  airdrop: "✦",
  dash: "⚡",
  blast: "✸",
  stack: "▣",
  referral: "⇄",
  gift: "🎁",
  stake: "⬢",
  vault: "❖",
  nft: "◈",
};

export function PlaygroundCard({ card }: { card: CardType }) {
  const isActive = card.status === "active";
  const accent = ACCENTS[card.accent];

  const inner = (
    <div
      className={`card relative h-full overflow-hidden p-6 ${
        isActive ? "card-hover" : "opacity-70"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br ${accent} blur-2xl`}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl ${accent.split(" ").pop()}`}
          >
            {GLYPHS[card.icon] ?? "◇"}
          </span>
          {isActive ? <ActiveBadge>Active</ActiveBadge> : <ComingSoonBadge />}
        </div>
        <h3 className="mt-4 text-lg font-bold text-white">{card.title}</h3>
        <p className="mt-1 flex-1 text-sm text-slate-400">{card.description}</p>
        <div className="mt-4 text-sm font-medium">
          {isActive ? (
            <span className="text-neon-cyan">Open →</span>
          ) : (
            <span className="text-slate-500">Coming Soon</span>
          )}
        </div>
      </div>
    </div>
  );

  if (isActive) {
    return (
      <Link href={card.href} className="group block h-full">
        {inner}
      </Link>
    );
  }
  return (
    <Link href={card.href} className="block h-full" aria-disabled>
      {inner}
    </Link>
  );
}
