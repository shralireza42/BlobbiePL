import Link from "next/link";
import { ActiveBadge, ComingSoonBadge } from "./ui";
import type { PlaygroundCard as CardType } from "@/lib/routes";

const GLYPHS: Record<string, string> = {
  draw: "◎",
  airdrop: "✦",
  referral: "⇄",
  gift: "🎁",
  stake: "⬢",
  vault: "❖",
};

export function PlaygroundCard({ card }: { card: CardType }) {
  const isActive = card.status === "active";

  const inner = (
    <div
      className={`card relative h-full overflow-hidden p-6 ${
        isActive ? "card-hover" : "opacity-75"
      }`}
    >
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cream/15 bg-cream/5 text-xl text-cream">
            {GLYPHS[card.icon] ?? "◇"}
          </span>
          {isActive ? <ActiveBadge>Active</ActiveBadge> : <ComingSoonBadge />}
        </div>
        <h3 className="mt-4 text-lg font-display not-italic">{card.title}</h3>
        <h6 className="mt-1 flex-1 text-sm text-cream-dim">{card.description}</h6>
        <div className="mt-4 text-sm not-italic">
          {isActive ? (
            <span className="font-bold text-accent-lime">Open →</span>
          ) : (
            <span className="text-cream-dim">Coming Soon</span>
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
