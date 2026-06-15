"use client";

import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/client-api";
import { formatUsd, shortenAddress } from "@/lib/format";
import { bscScanTx } from "@/lib/config";
import { EmptyState, Skeleton } from "@/components/ui";

type Winner = {
  rank: number;
  wallet: string;
  tier: string;
  usdAmount: number;
  claimStatus: "UNCLAIMED" | "CLAIMED" | "EXPIRED";
  txHash?: string | null;
};

type Result = {
  round: { roundNumber: number };
  winners: Winner[];
};

const CLAIM_STYLES: Record<string, string> = {
  CLAIMED: "text-emerald-300",
  UNCLAIMED: "text-amber-300",
  EXPIRED: "text-slate-500",
};

export function Results() {
  const { data, isLoading } = useQuery({
    queryKey: ["draw-results"],
    queryFn: () => getJson<{ results: Result[] }>("/api/draw/results"),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const results = data?.results ?? [];
  if (results.length === 0) {
    return (
      <EmptyState
        title="No previous results yet"
        description="Completed round results will appear here once the first round closes."
      />
    );
  }

  return (
    <div className="space-y-6">
      {results.map((r) => (
        <div key={r.round.roundNumber} className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Round #{r.round.roundNumber} Results
            </h3>
            <span className="text-xs text-slate-400">
              Showing top {r.winners.length}
            </span>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Prize</th>
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3 text-right">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {r.winners.map((w) => (
                  <tr key={`${r.round.roundNumber}-${w.rank}`}>
                    <td className="px-4 py-3 font-medium text-white">#{w.rank}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {shortenAddress(w.wallet, 5)}
                    </td>
                    <td className="px-4 py-3 text-neon-cyan">
                      {formatUsd(w.usdAmount)}
                    </td>
                    <td className={`px-4 py-3 ${CLAIM_STYLES[w.claimStatus]}`}>
                      {w.claimStatus}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {w.txHash ? (
                        <a
                          href={bscScanTx(w.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neon-cyan hover:underline"
                        >
                          ↗
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
