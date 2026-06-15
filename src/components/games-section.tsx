import Link from "next/link";
import { GAME_CARDS } from "@/lib/routes";
import { ComingSoonBadge } from "./ui";

const ACCENT_RING: Record<string, string> = {
  lime: "group-hover:border-accent-lime/50",
  green: "group-hover:border-accent-green/50",
  cream: "group-hover:border-cream/50",
};

export function GamesSection() {
  return (
    <section className="container-px py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-xs uppercase not-italic tracking-[0.25em] text-accent-lime">
            Arcade
          </p>
          <h2 className="mt-2 text-3xl font-display not-italic sm:text-4xl">
            Games — Coming Soon
          </h2>
          <h6 className="mt-2 max-w-xl text-cream-dim">
            Three Blobbie mini-games are on the way, each with on-chain scores and
            Airdrop Point rewards.
          </h6>
        </div>
        <ComingSoonBadge />
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_CARDS.map((game) => (
          <Link
            key={game.href}
            href={game.href}
            className={`group card overflow-hidden border-cream/10 transition ${ACCENT_RING[game.accent]}`}
          >
            <div className="relative aspect-[3/2] w-full overflow-hidden">
              {/* Swappable preview image — replace files in /public/games */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={game.image}
                alt={game.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute left-3 top-3">
                <ComingSoonBadge />
              </span>
            </div>
            <div className="p-5">
              <h3 className="text-xl font-display not-italic">{game.title}</h3>
              <h6 className="mt-1 text-sm text-cream-dim">{game.description}</h6>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
