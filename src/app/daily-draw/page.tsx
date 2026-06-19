import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { SectionHeading } from "@/components/ui";
import { DrawConsole } from "@/components/daily-draw/draw-console";
import { PrizeDistribution } from "@/components/daily-draw/prize-distribution";
import { DrawRules } from "@/components/daily-draw/rules";
import { Transparency } from "@/components/daily-draw/transparency";
import { Results } from "@/components/daily-draw/results";
import { GlobalChat } from "@/components/daily-draw/global-chat";
import { PlaygroundCard } from "@/components/playground-card";
import { AutoTask } from "@/hooks/useAutoTask";
import { DRAW_COMING_SOON_CARDS, ROUTES } from "@/lib/routes";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Daily Draw",
  description:
    "Join the Blobbie Daily Draw — a transparent 24-hour on-chain rewards round on BNB Chain. 1 ticket = $1 in $BLOBBIE.",
};

const HOW_TO_PLAY = [
  { step: "1", title: "Connect & verify", body: "Connect MetaMask / Trust / WalletConnect on BNB Chain and sign once to verify." },
  { step: "2", title: "Buy tickets", body: "1 ticket = $1 in $BLOBBIE. Up to 50 per round (1 ticket = 1 entry)." },
  { step: "3", title: "Round closes", body: "When 300 tickets sell or 24h passes, the round closes and winners are drawn." },
  { step: "4", title: "Random & fair", body: "Winners are picked with a verifiable random seed (Chainlink VRF when live)." },
  { step: "5", title: "Claim rewards", body: "If you win, your prize shows in results — claim it to your wallet." },
];

export default function DailyDrawPage() {
  return (
    <PageShell>
      <AutoTask taskKey="view_daily_draw" />
      <section className="container-px py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            eyebrow="Active Product"
            title="Daily Draw"
            subtitle="A transparent 24-hour rewards round. A round closes at 300 tickets or after 24 hours — guaranteed to run daily."
          />
          {config.isMockMode && (
            <span className="chip border-accent-lime/40 bg-accent-lime/10 text-accent-lime">
              Beta Mock Mode
            </span>
          )}
        </div>

        {/* How to play: connect → buy → draw → claim */}
        <div className="mt-8 card p-6">
          <h3 className="font-display not-italic text-lg">How to play</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {HOW_TO_PLAY.map((s) => (
              <div key={s.step} className="rounded-2xl border border-cream/10 bg-cream/5 p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-lime font-display text-sm not-italic text-ink">
                  {s.step}
                </span>
                <p className="mt-2 font-display not-italic text-sm text-cream">{s.title}</p>
                <p className="mt-1 text-xs not-italic text-cream-dim">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <DrawConsole />
        </div>

        {/* Community chat fills the space between the round and prize sections */}
        <div className="mt-10">
          <SectionHeading
            eyebrow="Community"
            title="Blobbie Global Chat"
            subtitle="Chat with other players while the round is live."
          />
          <div className="mt-6">
            <GlobalChat />
          </div>
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

      {/* Other Coming Soon modules (Jackpot + mini-games live on the home page) */}
      <section className="container-px pb-16 pt-4">
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
