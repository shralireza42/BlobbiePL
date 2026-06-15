import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { SectionHeading } from "@/components/ui";
import { DrawConsole } from "@/components/daily-draw/draw-console";
import { PrizeDistribution } from "@/components/daily-draw/prize-distribution";
import { DrawRules } from "@/components/daily-draw/rules";
import { Transparency } from "@/components/daily-draw/transparency";
import { Results } from "@/components/daily-draw/results";
import { AutoTask } from "@/hooks/useAutoTask";
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
            <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-300">
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
          <SectionHeading title="Previous Round Results" />
          <div className="mt-6">
            <Results />
          </div>
        </div>

        <div className="mt-10">
          <Transparency />
        </div>
      </section>
    </PageShell>
  );
}
