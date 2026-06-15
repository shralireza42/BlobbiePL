import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PlaygroundCard } from "@/components/playground-card";
import { SectionHeading } from "@/components/ui";
import { PLAYGROUND_CARDS } from "@/lib/routes";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "The Blobbie Playground hub — Daily Rewards Draw, Airdrop Hub, and a growing set of mini-games and modules.",
};

export default function PlaygroundPage() {
  const active = PLAYGROUND_CARDS.filter((c) => c.status === "active");
  const comingSoon = PLAYGROUND_CARDS.filter((c) => c.status === "coming-soon");

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
            <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-300">
              Beta Mock Mode
            </span>
          )}
        </div>

        <div className="mt-8">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Active Now
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            {active.map((card) => (
              <PlaygroundCard key={card.href} card={card} />
            ))}
          </div>
        </div>

        <div className="mt-12">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Coming Soon
          </h3>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {comingSoon.map((card) => (
              <PlaygroundCard key={card.href} card={card} />
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
