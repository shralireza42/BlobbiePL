import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { SectionHeading } from "@/components/ui";
import { DrawConsole } from "@/components/daily-draw/draw-console";
import { PrizeDistribution } from "@/components/daily-draw/prize-distribution";
import { DrawRules } from "@/components/daily-draw/rules";
import { Transparency } from "@/components/daily-draw/transparency";
import { Results } from "@/components/daily-draw/results";
import { GamesSection } from "@/components/games-section";
import { PlaygroundCard } from "@/components/playground-card";
import { AutoTask } from "@/hooks/useAutoTask";
import { DRAW_COMING_SOON_CARDS, ROUTES } from "@/lib/routes";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Daily Rewards Draw",
  description:
    "Join the Blobbie Daily Rewards Draw — a transparent 24-hour on-chain rewards round on BNB Chain. 1 ticket = $1 in $BLOBBIE.",
};

export default function DailyDrawPage() {
  return (
    <PageShell>
      <AutoTask taskKey="view_daily_draw" />
      <section className="container-px py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            eyebrow="Active Product"
            title="Daily Rewards Draw"
            subtitle="A transparent 24-hour rewards round. A round closes at 300 participants or after 24 hours — guaranteed to run daily."
          />
          {config.isMockMode && (
            <span className="chip border-accent-lime/40 bg-accent-lime/10 text-accent-lime">
              Beta Mock Mode
            </span>
          )}
        </div>

        <div className="mt-8">
          <DrawConsole />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <PrizeDistribution />
          <DrawRules />
        </div>

        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeading title="Last Round Result" />
            <Link href={ROUTES.verify} className="btn-ghost">
              Verify any round →
            </Link>
          </div>
          <div className="mt-6">
            <Results limit={1} />
          </div>
        </div>

        <div className="mt-10">
          <Transparency />
        </div>
      </section>

      {/* Other Coming Soon modules (Jackpot lives on the home page) */}
      <GamesSection />

      <section className="container-px pb-16">
        <h3 className="mb-4 text-sm font-display not-italic uppercase tracking-wider text-cream-dim">
          More Coming Soon
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DRAW_COMING_SOON_CARDS.map((card) => (
            <PlaygroundCard key={card.href} card={card} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
