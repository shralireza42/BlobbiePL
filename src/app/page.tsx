import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ActiveBadge, ComingSoonBadge } from "@/components/ui";
import { GamesSection } from "@/components/games-section";
import { JACKPOT_CARD, ROUTES } from "@/lib/routes";
import { config } from "@/lib/config";
import { getFeatures } from "@/lib/services/features";

export default async function HomePage() {
  const features = await getFeatures();
  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
        <div className="container-px relative py-20 sm:py-28">
          <div className="mx-auto max-w-4xl text-center">
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
            <h1
              className="whitespace-nowrap font-extrabold text-white"
              style={{ fontSize: "clamp(2rem, 9vw, 7rem)", lineHeight: 1 }}
            >
              ITS BLOBBIE
            </h1>
            <h6 className="mx-auto mt-6 max-w-2xl text-pretty text-base text-cream-dim sm:text-lg">
              A transparent Web3 reward ecosystem powered by the $BLOBBIE BEP-20
              token. Join the Daily Rewards Draw, earn Airdrop Points, and explore
              a growing ecosystem — verifiable and built for the long term.
            </h6>
          </div>
        </div>
      </section>

      {/* Active module — Daily Rewards Draw (full-size, transparent image box) */}
      <ActiveSection
        index="01"
        eyebrow="Active Product"
        title="Daily Rewards Draw"
        description="A transparent 24-hour on-chain rewards round. 1 ticket = $1 in $BLOBBIE. A round closes at 300 participants or after 24 hours — guaranteed to run daily, with results designed to be on-chain verifiable."
        href={ROUTES.dailyDraw}
        cta="Open Daily Rewards Draw"
        image="/sections/daily-draw.svg"
        stats={[
          { label: "Round window", value: "24h" },
          { label: "Capacity", value: "300" },
          { label: "Winners / round", value: "150" },
        ]}
      />

      {/* Active module — Airdrop Hub (full-size, transparent image box) */}
      <ActiveSection
        index="02"
        eyebrow="Active Beta Module"
        title="Airdrop Hub"
        description="Complete beta actions to earn Airdrop Points. Points track contribution — they do not guarantee token rewards. Final allocation is admin-reviewed and anti-sybil checked."
        href={ROUTES.airdrop}
        cta="Open Airdrop Hub"
        image="/sections/airdrop.svg"
        align="right"
        stats={[
          { label: "Tasks", value: "9" },
          { label: "Daily streak", value: "Yes" },
          { label: "Leaderboard", value: "Live" },
        ]}
      />

      {/* Mini-games — three coming soon boxes with editable transparent images */}
      {features.minigamesEnabled && <GamesSection />}

      {/* Coming Soon — Jackpot only (transparent, editable image background) */}
      <section className="container-px py-16">
        {/*
          Background art is editable: replace /public/sections/jackpot.svg
          (or drop a PNG with the same name).
        */}
        <div className="relative min-h-[280px] overflow-hidden rounded-3xl border-2 border-cream/15 p-8 sm:p-12">
          {/* Image fills the frame regardless of its aspect ratio. Replace
              /public/sections/jackpot.svg (or drop a PNG with the same name). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sections/jackpot.svg"
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          {/* Scrim keeps the text readable over any image */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/85 via-bg/45 to-transparent" />
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-lg">
              <ComingSoonBadge />
              <h2 className="mt-3 text-3xl font-display not-italic sm:text-4xl">
                {JACKPOT_CARD.title}
              </h2>
              <h6 className="mt-2 text-cream-dim">
                {JACKPOT_CARD.description} Provably fair and VRF-compatible when
                live.
              </h6>
            </div>
            <Link href={JACKPOT_CARD.href} className="btn-ghost shrink-0">
              Learn more →
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function ActiveSection({
  index,
  eyebrow,
  title,
  description,
  href,
  cta,
  image,
  stats,
  align = "left",
}: {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  image: string;
  stats: { label: string; value: string }[];
  align?: "left" | "right";
}) {
  return (
    <section className="container-px flex min-h-[78vh] items-center py-12">
      <div
        className={`grid w-full items-center gap-10 lg:grid-cols-2 ${
          align === "right" ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="font-display text-5xl not-italic text-cream/20">
              {index}
            </span>
            <ActiveBadge>Active</ActiveBadge>
          </div>
          <p className="mt-4 font-display text-xs uppercase not-italic tracking-[0.25em] text-accent-lime">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-4xl font-display not-italic sm:text-6xl">
            {title}
          </h2>
          <h6 className="mt-5 max-w-xl text-base text-cream-dim sm:text-lg">
            {description}
          </h6>
          <div className="mt-8">
            <Link href={href} className="btn-primary">
              {cta}
            </Link>
          </div>
        </div>

        {/*
          Box with image background — edit the file in /public/sections (or drop
          a PNG with the same name). The <img> fills the frame at any aspect.
        */}
        <div className="relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl border-2 border-cream/15 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div className="relative z-10 grid grid-cols-3 gap-4 rounded-2xl border border-cream/10 bg-bg/60 p-4 backdrop-blur">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-2xl not-italic text-cream sm:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs not-italic text-cream-dim">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
