import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ActiveBadge } from "@/components/ui";
import { GamesSection } from "@/components/games-section";
import { ROUTES } from "@/lib/routes";
import { config } from "@/lib/config";

export default function HomePage() {
  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
        <div className="container-px relative py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              <span className="chip border-cream/20 bg-cream/5 text-cream">
                Blobbie Playground Beta
              </span>
              <span className="chip border-cream/20 bg-cream/5 text-cream-dim">
                Built on BNB Chain
              </span>
              {config.isMockMode && (
                <span className="chip border-accent-lime/40 bg-accent-lime/10 text-accent-lime">
                  Beta Mock Mode
                </span>
              )}
            </div>
            <h1 className="text-balance text-5xl leading-[0.95] sm:text-7xl">
              ITS
              <br />
              <span className="neon-text">BLOBBIE</span>
            </h1>
            <h6 className="mx-auto mt-6 max-w-2xl text-pretty text-base text-cream-dim sm:text-lg">
              A transparent Web3 reward ecosystem powered by the $BLOBBIE BEP-20
              token. Join the Daily Rewards Draw, earn Airdrop Points, and explore
              a growing Playground — verifiable and built for the long term.
            </h6>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={ROUTES.playground} className="btn-primary w-full sm:w-auto">
                Enter Playground
              </Link>
              <Link href={ROUTES.dailyDraw} className="btn-ghost w-full sm:w-auto">
                View Daily Rewards Draw
              </Link>
            </div>
            <h6 className="mt-4 text-xs text-cream-dim">
              No exaggerated promises. Rewards are not guaranteed. Beta features
              may run in mock mode.
            </h6>
          </div>
        </div>
      </section>

      {/* Active modules */}
      <section className="container-px py-10">
        <div className="grid gap-5 md:grid-cols-2">
          <ActiveModuleCard
            href={ROUTES.dailyDraw}
            title="Daily Rewards Draw"
            description="A 24-hour on-chain rewards round. 1 ticket = $1 in $BLOBBIE. A round closes at 300 participants or after 24 hours — guaranteed to run daily."
          />
          <ActiveModuleCard
            href={ROUTES.airdrop}
            title="Airdrop Hub"
            description="Complete beta actions to earn Airdrop Points. Points track contribution — final allocation is admin-reviewed and anti-sybil checked."
          />
        </div>
      </section>

      {/* Games — dedicated coming soon section with swappable images */}
      <GamesSection />

      {/* Trust band */}
      <section className="container-px py-10">
        <div className="grid gap-5 sm:grid-cols-3">
          <TrustCard
            title="On-Chain Transparency"
            body="Draws and prize distributions are designed to be verifiable on BNB Chain with VRF-compatible randomness when live."
          />
          <TrustCard
            title="Sustainable Utility"
            body="$BLOBBIE incorporates burn/treasury allocation and participation incentives for long-term ecosystem health."
          />
          <TrustCard
            title="Low Fees, Fast Settlement"
            body="BNB Chain enables minimal network fees and near-instant automated distributions to participants."
          />
        </div>
        <div className="mt-8 text-center">
          <Link href={ROUTES.playground} className="btn-ghost">
            See everything in the Playground →
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

function ActiveModuleCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="card card-hover group relative overflow-hidden p-7">
      <div className="relative">
        <div className="flex items-center justify-between">
          <ActiveBadge>Active</ActiveBadge>
          <span className="text-cream-dim transition group-hover:translate-x-1 group-hover:text-cream">
            →
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-display not-italic sm:text-3xl">
          {title}
        </h3>
        <h6 className="mt-2 text-sm text-cream-dim">{description}</h6>
      </div>
    </Link>
  );
}

function TrustCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-6">
      <h4 className="font-display not-italic text-lg">{title}</h4>
      <h6 className="mt-2 text-sm text-cream-dim">{body}</h6>
    </div>
  );
}
