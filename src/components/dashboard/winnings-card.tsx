"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWalletSession } from "@/hooks/useWalletSession";
import { getJson, postJson } from "@/lib/client-api";
import { formatUsd } from "@/lib/format";
import { bscScanTx } from "@/lib/config";
import { Skeleton } from "@/components/ui";

type Winning = {
  roundNumber: number;
  rank: number;
  usdAmount: number;
  claimStatus: "UNCLAIMED" | "CLAIMED" | "EXPIRED";
  txHash: string | null;
};

export function WinningsCard() {
  const { session } = useWalletSession();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-winnings", session.wallet],
    queryFn: () => getJson<{ winnings: Winning[] }>("/api/draw/my-winnings"),
    enabled: session.authenticated,
    refetchInterval: 30_000,
  });

  const [claiming, setClaiming] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!session.authenticated) return null;
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const winnings = data?.winnings ?? [];

  async function claim(roundNumber: number) {
    setClaiming(roundNumber);
    setMsg(null);
    const res = await postJson<{ message: string }>("/api/draw/claim", {
      roundId: roundNumber,
    });
    setClaiming(null);
    setMsg(res.data?.message ?? res.error ?? null);
    refetch();
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display not-italic">Your Winnings</h3>
        {msg && <span className="text-xs not-italic text-accent-lime">{msg}</span>}
      </div>

      {winnings.length === 0 ? (
        <p className="mt-3 text-sm not-italic text-cream-dim">
          No winnings yet. Buy tickets in the Daily Draw for a chance to win.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-cream/10">
          <table className="w-full text-sm">
            <thead className="bg-cream/5 text-left text-xs uppercase tracking-wider text-cream-dim">
              <tr>
                <th className="px-4 py-3">Round</th>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Prize</th>
                <th className="px-4 py-3 text-right">Claim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream/5">
              {winnings.map((w) => (
                <tr key={w.roundNumber}>
                  <td className="px-4 py-3 font-display not-italic text-cream">
                    #{w.roundNumber}
                  </td>
                  <td className="px-4 py-3 text-cream-soft">#{w.rank}</td>
                  <td className="px-4 py-3 text-accent-lime">{formatUsd(w.usdAmount)}</td>
                  <td className="px-4 py-3 text-right">
                    {w.claimStatus === "CLAIMED" ? (
                      <span className="text-emerald-300">
                        ✓ Claimed
                        {w.txHash && (
                          <a
                            href={bscScanTx(w.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-1 text-accent-lime hover:underline"
                          >
                            ↗
                          </a>
                        )}
                      </span>
                    ) : (
                      <button
                        className="btn-accent px-4 py-1.5"
                        disabled={claiming === w.roundNumber}
                        onClick={() => claim(w.roundNumber)}
                      >
                        {claiming === w.roundNumber ? "Claiming…" : "Claim"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
