"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWalletSession } from "@/hooks/useWalletSession";
import { getJson } from "@/lib/client-api";
import { WalletButton } from "@/components/wallet-button";
import { Skeleton } from "@/components/ui";

type ReferralProfile = {
  code: string | null;
  link: string | null;
  referredBy: string | null;
  referralCount: number;
  pointsEarned: number;
  rewards: { referrer: number; referee: number };
};

export function ReferralPanel() {
  const { session } = useWalletSession();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["referral-me", session.wallet],
    queryFn: () => getJson<ReferralProfile>("/api/referral/me"),
    enabled: session.authenticated,
    refetchInterval: 30_000,
  });

  if (!session.authenticated) {
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <h3 className="text-lg font-display not-italic">Referrals</h3>
        <p className="max-w-md text-sm text-cream-dim">
          Connect and verify your wallet to get your referral link.
        </p>
        <WalletButton />
      </div>
    );
  }

  if (isLoading || !data) return <Skeleton className="h-44 w-full" />;

  async function copy() {
    if (!data?.link) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display not-italic">Refer Friends</h3>
        <span className="text-xs not-italic text-cream-dim">
          +{data.rewards.referee} you · +{data.rewards.referrer} friend
        </span>
      </div>
      <p className="mt-1 text-sm text-cream-dim">
        Share your link. When a friend joins and verifies their wallet, you both
        earn Airdrop Points.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input className="input flex-1 font-mono text-xs" readOnly value={data.link ?? ""} />
        <button className="btn-accent" onClick={copy} disabled={!data.link}>
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Your code" value={data.code ?? "—"} mono />
        <Stat label="Friends joined" value={String(data.referralCount)} />
        <Stat label="Points earned" value={String(data.pointsEarned)} />
      </div>

      {data.referredBy && (
        <p className="mt-3 text-xs not-italic text-cream-dim">
          You were referred by {data.referredBy.slice(0, 6)}…{data.referredBy.slice(-4)}.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-cream/10 bg-cream/5 p-3 text-center">
      <p className="stat-label">{label}</p>
      <p className={`mt-1 font-display not-italic text-cream ${mono ? "text-sm" : ""}`}>
        {value}
      </p>
    </div>
  );
}
