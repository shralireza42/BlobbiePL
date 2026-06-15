import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PlaygroundCard } from "@/components/playground-card";
import { GamesSection } from "@/components/games-section";
import { SectionHeading } from "@/components/ui";
import { ACTIVE_CARDS, PLAYGROUND_ONLY_CARDS } from "@/lib/routes";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "The Blobbie Playground hub — Daily Rewards Draw, Airdrop Hub, and a growing set of mini-games and modules.",
};

export default function PlaygroundPage() {
  return (
    <PageShell>
      <section className="container-px py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            eyebrow="Playground Beta"
            title="Your Blobbie Playground"
            subtitle="Start with the active modules. More games and features unlock soon."
          />
          {config.isMockMode && (
            <span className="chip border-accent-lime/40 bg-accent-lime/10 text-accent-lime">
              Beta Mock Mode
            </span>
          )}
        </div>

        <div className="mt-8">
          <h3 className="mb-4 text-sm font-display not-italic uppercase tracking-wider text-cream-dim">
            Active Now
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            {ACTIVE_CARDS.map((card) => (
              <PlaygroundCard key={card.href} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* Games — dedicated coming soon section with swappable images */}
      <GamesSection />

      <section className="container-px py-12">
        <h3 className="mb-4 text-sm font-display not-italic uppercase tracking-wider text-cream-dim">
          More Coming Soon
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLAYGROUND_ONLY_CARDS.map((card) => (
            <PlaygroundCard key={card.href} card={card} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
