import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ActiveBadge, ComingSoonBadge } from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { config } from "@/lib/config";

const COMING_SOON = [
  "Mini-Games",
  "Referrals",
  "Free Entries",
  "Staking",
  "Jackpot",
  "NFTs",
];

export default function HomePage() {
  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid-glow opacity-70" />
        <div className="container-px relative py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              <span className="chip border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
                Blobbie Playground Beta
              </span>
              <span className="chip border-white/15 bg-white/5 text-slate-300">
                Built on BNB Chain
              </span>
              {config.isMockMode && (
                <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-300">
                  Beta Mock Mode
                </span>
              )}
            </div>
            <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              Transparent on-chain rewards,
              <br />
              <span className="neon-text">the Blobbie way.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-slate-400 sm:text-lg">
              A Web3 reward ecosystem powered by the $BLOBBIE BEP-20 token. Join
              the Daily Rewards Draw, earn Airdrop Points, and explore a growing
              Playground — verifiable and built for the long term.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={ROUTES.playground} className="btn-primary w-full sm:w-auto">
                Enter Playground
              </Link>
              <Link href={ROUTES.dailyDraw} className="btn-ghost w-full sm:w-auto">
                View Daily Rewards Draw
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              No exaggerated promises. Rewards are not guaranteed. Beta features
              may run in mock mode.
            </p>
          </div>
        </div>
      </section>

      {/* Active modules */}
      <section className="container-px py-10">
        <div className="grid gap-5 md:grid-cols-2">
          <ActiveModuleCard
            href={ROUTES.dailyDraw}
            badge={<ActiveBadge>Active</ActiveBadge>}
            title="Daily Rewards Draw"
            description="A 24-hour on-chain rewards round. 1 ticket = $1 in $BLOBBIE. A round closes at 300 participants or after 24 hours — guaranteed to run daily."
            accent="from-neon-cyan/20 to-neon-blue/10"
          />
          <ActiveModuleCard
            href={ROUTES.airdrop}
            badge={<ActiveBadge>Active</ActiveBadge>}
            title="Airdrop Hub"
            description="Complete beta actions to earn Airdrop Points. Points track contribution — final allocation is admin-reviewed and anti-sybil checked."
            accent="from-neon-purple/20 to-neon-pink/10"
          />
        </div>
      </section>

      {/* Coming soon strip */}
      <section className="container-px py-10">
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-purple">
                Roadmap
              </p>
              <h3 className="mt-1 text-xl font-bold text-white">Coming Soon</h3>
            </div>
            <ComingSoonBadge />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {COMING_SOON.map((item) => (
              <span
                key={item}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

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
      </section>
    </PageShell>
  );
}

function ActiveModuleCard({
  href,
  badge,
  title,
  description,
  accent,
}: {
  href: string;
  badge: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link href={href} className="card card-hover group relative overflow-hidden p-6">
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${accent} blur-2xl`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          {badge}
          <span className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-neon-cyan">
            →
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>
    </Link>
  );
}

function TrustCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-6">
      <h4 className="font-semibold text-white">{title}</h4>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
    </div>
  );
}
