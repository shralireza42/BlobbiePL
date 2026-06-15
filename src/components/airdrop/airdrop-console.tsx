"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useWalletSession } from "@/hooks/useWalletSession";
import { getJson, postJson } from "@/lib/client-api";
import { shortenAddress } from "@/lib/format";
import { WalletButton } from "@/components/wallet-button";
import { Disclaimer, Skeleton } from "@/components/ui";
import { AIRDROP_DISCLAIMER } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";

type Task = {
  key: string;
  title: string;
  description: string;
  points: number;
  type: "ONE_TIME" | "DAILY" | "MANUAL";
  status: "ACTIVE" | "COMING_SOON" | "DISABLED";
  requiresAdmin: boolean;
  completed: boolean;
  pending: boolean;
};

type Profile = {
  connected: boolean;
  wallet: string | null;
  totalPoints: number;
  rank: number | null;
  eligibility:
    | "NOT_CONNECTED"
    | "ELIGIBLE"
    | "PENDING_REVIEW"
    | "FLAGGED"
    | "APPROVED";
  tasks: Task[];
  completedCount: number;
  pendingCount: number;
  isMock: boolean;
};

const ELIGIBILITY_STYLES: Record<string, string> = {
  NOT_CONNECTED: "border-cream/15 bg-cream/5 text-cream-dim",
  ELIGIBLE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  PENDING_REVIEW: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  FLAGGED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  APPROVED: "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan",
};

const ELIGIBILITY_LABELS: Record<string, string> = {
  NOT_CONNECTED: "Not Connected",
  ELIGIBLE: "Eligible",
  PENDING_REVIEW: "Pending Review",
  FLAGGED: "Flagged",
  APPROVED: "Approved",
};

export function AirdropConsole() {
  const { session } = useWalletSession();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["airdrop-profile", session.wallet],
    queryFn: () =>
      getJson<{ profile: Profile; disclaimer: string }>("/api/airdrop/profile"),
    refetchInterval: 30_000,
  });

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;
  const profile = data.profile;

  return (
    <div className="space-y-6">
      <Disclaimer>
        <span className="font-semibold text-amber-300">Beta:</span>{" "}
        {data.disclaimer || AIRDROP_DISCLAIMER}
      </Disclaimer>

      {!profile.connected ? (
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <h3 className="text-xl font-bold text-cream">Connect to start earning</h3>
          <p className="max-w-md text-sm text-cream-dim">
            Connect and verify your wallet to track Airdrop Points and complete
            beta tasks.
          </p>
          <WalletButton />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Total Points" value={profile.totalPoints.toString()} highlight />
            <StatCard
              label="Rank"
              value={profile.rank ? `#${profile.rank}` : "—"}
            />
            <StatCard
              label="Completed"
              value={`${profile.completedCount}`}
            />
            <div className={`card p-4`}>
              <p className="stat-label">Eligibility</p>
              <span
                className={`mt-2 inline-flex chip ${ELIGIBILITY_STYLES[profile.eligibility]}`}
              >
                {ELIGIBILITY_LABELS[profile.eligibility]}
              </span>
            </div>
          </div>

          {profile.isMock && (
            <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-2 text-xs text-amber-300">
              Beta Mock Mode — database not configured. Task progress is not
              persisted.
            </p>
          )}

          <TaskList tasks={profile.tasks} onChange={() => refetch()} />
        </>
      )}

      <Leaderboard />

      <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h3 className="font-bold text-cream">Boost your points</h3>
          <p className="text-sm text-cream-dim">
            Joining the Daily Rewards Draw earns Airdrop Points automatically.
          </p>
        </div>
        <Link href={ROUTES.dailyDraw} className="btn-primary">
          Go to Daily Rewards Draw
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-4 ${highlight ? "border-neon-purple/30" : ""}`}>
      <p className="stat-label">{label}</p>
      <p className="mt-1 text-2xl font-bold text-cream">{value}</p>
    </div>
  );
}

function TaskList({
  tasks,
  onChange,
}: {
  tasks: Task[];
  onChange: () => void;
}) {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-cream">Tasks</h3>
      <div className="mt-4 space-y-3">
        {tasks.map((task) => (
          <TaskRow key={task.key} task={task} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task, onChange }: { task: Task; onChange: () => void }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const disabled =
    loading || task.completed || task.status !== "ACTIVE" || task.pending;

  async function claim() {
    setLoading(true);
    setMsg(null);
    const res = await postJson<{ message: string }>("/api/airdrop/claim", {
      taskKey: task.key,
    });
    setLoading(false);
    setMsg(res.data?.message ?? res.error ?? null);
    onChange();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-cream/10 bg-cream/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-cream">{task.title}</p>
          {task.type === "DAILY" && (
            <span className="chip border-neon-blue/30 bg-neon-blue/10 text-neon-blue">
              Daily
            </span>
          )}
          {task.requiresAdmin && task.status === "ACTIVE" && (
            <span className="chip border-cream/15 bg-cream/5 text-cream-dim">
              Manual
            </span>
          )}
          {task.status === "COMING_SOON" && (
            <span className="chip border-cream/15 bg-cream/5 text-cream-dim">
              Coming Soon
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-cream-dim">{task.description}</p>
        {msg && <p className="mt-1 text-xs text-neon-cyan">{msg}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-neon-purple">
          +{task.points}
        </span>
        {task.completed ? (
          <span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            ✓ Done
          </span>
        ) : task.pending ? (
          <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-300">
            Pending
          </span>
        ) : (
          <button className="btn-ghost px-4 py-2" disabled={disabled} onClick={claim}>
            {loading ? "…" : task.status === "ACTIVE" ? "Claim" : "Soon"}
          </button>
        )}
      </div>
    </div>
  );
}

function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["airdrop-leaderboard"],
    queryFn: () =>
      getJson<{ leaderboard: { wallet: string; totalPoints: number }[] }>(
        "/api/airdrop/leaderboard",
      ),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.leaderboard ?? [];

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-cream">Leaderboard</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-cream-dim">
          No ranked participants yet. Be the first to earn points.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-cream/5">
          {rows.slice(0, 10).map((row, i) => (
            <div
              key={row.wallet}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span className="flex items-center gap-3">
                <span className="w-6 text-cream-dim">#{i + 1}</span>
                <span className="font-mono text-cream-soft">
                  {shortenAddress(row.wallet, 5)}
                </span>
              </span>
              <span className="font-semibold text-neon-purple">
                {row.totalPoints}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
