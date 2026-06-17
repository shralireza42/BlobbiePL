"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useWalletSession } from "@/hooks/useWalletSession";
import { useBlobbieBalance } from "@/hooks/useBlobbieBalance";
import { getJson } from "@/lib/client-api";
import { formatNumber, formatUsd, shortenAddress } from "@/lib/format";
import { WalletButton } from "@/components/wallet-button";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { LevelCard } from "@/components/dashboard/level-card";
import { Skeleton } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

// Free Entries, Jackpot and Staking are surfaced only on the Playground page.
const COMING_SOON = [
  { label: "Blobbie Dash", href: ROUTES.dash },
  { label: "Blobbie Blast", href: ROUTES.blast },
  { label: "Blobbie Stack", href: ROUTES.stack },
  { label: "Referrals", href: ROUTES.referrals },
];

export function DashboardClient() {
  const { address, isConnected, session } = useWalletSession();
  const { configured, balance } = useBlobbieBalance(address);

  const draw = useQuery({
    queryKey: ["dash-draw", session.wallet],
    queryFn: () =>
      getJson<{ round: { roundNumber: number }; userTickets: number }>(
        "/api/draw/current",
      ),
    enabled: session.authenticated,
  });

  const airdrop = useQuery({
    queryKey: ["dash-airdrop", session.wallet],
    queryFn: () =>
      getJson<{
        profile: { totalPoints: number; rank: number | null; eligibility: string };
      }>("/api/airdrop/profile"),
    enabled: session.authenticated,
  });

  if (!isConnected || !session.authenticated) {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <h3 className="text-xl font-bold text-cream">Connect your wallet</h3>
        <p className="max-w-md text-sm text-cream-dim">
          Sign in to view your $BLOBBIE balance, Daily Rewards Draw tickets and
          Airdrop Points in one place.
        </p>
        <WalletButton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {address && <ProfileCard wallet={address} />}

      <LevelCard />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Wallet" value={shortenAddress(address, 5)} mono />
        <Card
          label="$BLOBBIE Balance"
          value={
            configured
              ? balance !== null
                ? formatNumber(balance)
                : "…"
              : "Not configured"
          }
        />
        <Card
          label="Current Round Tickets"
          value={
            draw.isLoading ? "…" : String(draw.data?.userTickets ?? 0)
          }
          hint={draw.data ? `Round #${draw.data.round.roundNumber}` : undefined}
        />
        <Card
          label="Airdrop Points"
          value={
            airdrop.isLoading ? "…" : String(airdrop.data?.profile.totalPoints ?? 0)
          }
          hint={
            airdrop.data?.profile.rank
              ? `Rank #${airdrop.data.profile.rank}`
              : undefined
          }
          highlight
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-cream">Quick Actions</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ActionLink
              href={ROUTES.dailyDraw}
              title="Daily Rewards Draw"
              desc="Buy tickets & view the live round"
            />
            <ActionLink
              href={ROUTES.airdrop}
              title="Airdrop Hub"
              desc="Complete tasks & earn points"
            />
            <ActionLink
              href={ROUTES.verify}
              title="Verify Results"
              desc="Look up any round's winners"
            />
            <ActionLink
              href={ROUTES.dailyDraw}
              title="Claim Prizes"
              desc="Check results & claim winnings"
            />
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold text-cream">Airdrop Status</h3>
          <p className="mt-2 text-sm text-cream-dim">
            Eligibility:{" "}
            <span className="font-medium text-cream">
              {airdrop.data?.profile.eligibility ?? "—"}
            </span>
          </p>
          <p className="mt-4 text-xs text-cream-dim">
            Final rewards are admin-reviewed and anti-sybil checked. Points are
            calculated server-side.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-bold text-cream">Coming Soon</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COMING_SOON.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-2xl border border-cream/10 bg-cream/5 p-4 text-center text-sm not-italic text-cream-dim opacity-80 transition hover:opacity-100 hover:text-cream"
            >
              {c.label}
              <span className="mt-1 block text-[10px] uppercase tracking-wider text-cream-dim">
                Soon
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  hint,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-4 ${highlight ? "border-neon-purple/30" : ""}`}>
      <p className="stat-label">{label}</p>
      <p className={`mt-1 text-xl font-bold text-cream ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-cream-dim">{hint}</p>}
    </div>
  );
}

function ActionLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-cream/10 bg-cream/5 p-4 transition hover:border-neon-cyan/40"
    >
      <p className="font-medium text-cream">{title}</p>
      <p className="mt-0.5 text-sm text-cream-dim">{desc}</p>
      <span className="mt-2 inline-block text-sm text-neon-cyan opacity-0 transition group-hover:opacity-100">
        Open →
      </span>
    </Link>
  );
}
