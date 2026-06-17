import Link from "next/link";
import { GAME_CARDS } from "@/lib/routes";
import { ComingSoonBadge } from "./ui";

const ACCENT_RING: Record<string, string> = {
  lime: "hover:border-accent-lime/60",
  green: "hover:border-accent-green/60",
  cream: "hover:border-cream/60",
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
            Mini-Games — Coming Soon
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
            className={`group card overflow-hidden border-cream/15 bg-transparent transition ${ACCENT_RING[game.accent]}`}
          >
            {/*
              Transparent image background — edit /public/games/*.svg (or drop a
              PNG with the same name) to change the artwork.
            */}
            <div
              className="relative aspect-[3/2] w-full bg-contain bg-center bg-no-repeat transition duration-500 group-hover:scale-[1.03]"
              style={{ backgroundImage: `url(${game.image})` }}
            >
              <span className="absolute left-3 top-3">
                <ComingSoonBadge />
              </span>
            </div>
            <div className="border-t border-cream/10 p-5">
              <h3 className="text-xl font-display not-italic">{game.title}</h3>
              <h6 className="mt-1 text-sm text-cream-dim">{game.description}</h6>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
