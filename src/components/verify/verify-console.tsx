"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/client-api";
import { formatUsd, formatNumber, shortenAddress } from "@/lib/format";
import { ROUND_STATUS_LABELS } from "@/lib/constants";
import { bscScanTx } from "@/lib/config";
import { EmptyState, Skeleton } from "@/components/ui";

type Winner = {
  rank: number;
  wallet: string;
  usdAmount: number;
  claimStatus: "UNCLAIMED" | "CLAIMED" | "EXPIRED";
  txHash?: string | null;
};

type RoundResponse = {
  round: {
    roundNumber: number;
    status: keyof typeof ROUND_STATUS_LABELS;
    capacity: number;
    participants: number;
    totalTickets: number;
    supplementTickets: number;
    startTime: number;
    endTime: number;
    poolUsd: number;
    mockMode: boolean;
  };
  winners: Winner[];
  isCurrent: boolean;
  latestRound: number;
};

const CLAIM_STYLES: Record<string, string> = {
  CLAIMED: "text-emerald-300",
  UNCLAIMED: "text-gold",
  EXPIRED: "text-cream-dim",
};

export function VerifyConsole() {
  const params = useSearchParams();
  const initial = Number(params.get("round")) || 0;
  const [input, setInput] = useState(initial > 0 ? String(initial) : "");
  const [roundId, setRoundId] = useState<number | null>(initial > 0 ? initial : null);

  // Default to the most recent round that actually has results.
  const { data: latest } = useQuery({
    queryKey: ["verify-latest"],
    queryFn: () =>
      getJson<{
        results: { round: { roundNumber: number } }[];
      }>("/api/draw/results"),
    enabled: roundId === null,
  });
  const { data: current } = useQuery({
    queryKey: ["verify-current"],
    queryFn: () => getJson<{ round: { roundNumber: number } }>("/api/draw/current"),
    enabled: roundId === null,
  });

  useEffect(() => {
    if (roundId !== null) return;
    const latestSettled = latest?.results?.[0]?.round.roundNumber;
    const fallback = current?.round.roundNumber
      ? Math.max(1, current.round.roundNumber - 1)
      : undefined;
    const target = latestSettled ?? fallback;
    if (target) {
      setRoundId(target);
      setInput(String(target));
    }
  }, [latest, current, roundId]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["verify-round", roundId],
    queryFn: () => getJson<RoundResponse>(`/api/draw/round?roundId=${roundId}`),
    enabled: roundId !== null && roundId > 0,
    retry: false,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(input);
    if (Number.isInteger(n) && n > 0) setRoundId(n);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card flex flex-col gap-3 p-6 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="stat-label">Round number</span>
          <input
            type="number"
            min={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 42"
            className="input mt-1"
          />
        </label>
        <button type="submit" className="btn-accent">
          Verify Round
        </button>
        {data && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost px-4 py-3"
              onClick={() => {
                const n = Math.max(1, (roundId ?? 1) - 1);
                setRoundId(n);
                setInput(String(n));
              }}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="btn-ghost px-4 py-3"
              disabled={!!data && roundId !== null && roundId >= data.latestRound}
              onClick={() => {
                const n = (roundId ?? 0) + 1;
                setRoundId(n);
                setInput(String(n));
              }}
            >
              Next →
            </button>
          </div>
        )}
      </form>

      {isLoading && <Skeleton className="h-72 w-full" />}

      {isError && (
        <EmptyState
          title="Round unavailable"
          description={error instanceof Error ? error.message : "Try another round number."}
        />
      )}

      {data && <RoundView data={data} />}
    </div>
  );
}

function RoundView({ data }: { data: RoundResponse }) {
  const { round, winners } = data;
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-2xl font-display not-italic">
            Round #{round.roundNumber}
          </h3>
          <span className="chip border-cream/20 bg-cream/5 text-cream">
            {ROUND_STATUS_LABELS[round.status]}
            {data.isCurrent ? " · In progress" : ""}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Participants" value={`${round.participants}/${round.capacity}`} />
          <Metric label="Total Tickets" value={formatNumber(round.totalTickets, 0)} />
          <Metric label="Pool" value={formatUsd(round.poolUsd)} />
          <Metric label="Supplement" value={formatNumber(round.supplementTickets, 0)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-cream/10 bg-cream/5 p-3 text-xs not-italic">
            <p className="stat-label">Start</p>
            <p className="mt-1 text-cream">{new Date(round.startTime).toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-cream/10 bg-cream/5 p-3 text-xs not-italic">
            <p className="stat-label">End</p>
            <p className="mt-1 text-cream">{new Date(round.endTime).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {winners.length === 0 ? (
        <EmptyState
          title="No winners drawn yet"
          description="Winners appear once this round has closed and the draw has run."
        />
      ) : (
        <div className="card p-6">
          <h3 className="text-lg font-display not-italic">Winners</h3>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-cream/10">
            <table className="w-full text-sm">
              <thead className="bg-cream/5 text-left text-xs uppercase tracking-wider text-cream-dim">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Prize</th>
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3 text-right">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream/5">
                {winners.map((w) => (
                  <tr key={w.rank}>
                    <td className="px-4 py-3 font-display not-italic text-cream">#{w.rank}</td>
                    <td className="px-4 py-3 font-mono text-cream-soft">
                      {shortenAddress(w.wallet, 5)}
                    </td>
                    <td className="px-4 py-3 text-accent-lime">{formatUsd(w.usdAmount)}</td>
                    <td className={`px-4 py-3 ${CLAIM_STYLES[w.claimStatus]}`}>
                      {w.claimStatus}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {w.txHash ? (
                        <a
                          href={bscScanTx(w.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent-lime hover:underline"
                        >
                          ↗
                        </a>
                      ) : (
                        <span className="text-cream-dim">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cream/10 bg-cream/5 p-3">
      <p className="stat-label">{label}</p>
      <p className="mt-1 font-display not-italic text-cream">{value}</p>
    </div>
  );
}
