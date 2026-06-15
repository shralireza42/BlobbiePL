import { PRIZE_DISTRIBUTION, POOL_ALLOCATION, TOTAL_WINNERS } from "@/lib/constants";
import { formatUsd } from "@/lib/format";

export function PrizeDistribution() {
  const tiers = [
    {
      ...PRIZE_DISTRIBUTION.first,
      total: PRIZE_DISTRIBUTION.first.winners * PRIZE_DISTRIBUTION.first.usdEach,
    },
    {
      ...PRIZE_DISTRIBUTION.top10,
      total: PRIZE_DISTRIBUTION.top10.winners * PRIZE_DISTRIBUTION.top10.usdEach,
    },
    {
      ...PRIZE_DISTRIBUTION.top150,
      total: PRIZE_DISTRIBUTION.top150.winners * PRIZE_DISTRIBUTION.top150.usdEach,
    },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Prize Distribution</h3>
        <span className="text-xs text-slate-400">{TOTAL_WINNERS} winners</span>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Winners</th>
              <th className="px-4 py-3">Each</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tiers.map((t) => (
              <tr key={t.label}>
                <td className="px-4 py-3 font-medium text-white">{t.label}</td>
                <td className="px-4 py-3 text-slate-300">{t.winners}</td>
                <td className="px-4 py-3 text-slate-300">{formatUsd(t.usdEach)}</td>
                <td className="px-4 py-3 text-right text-neon-cyan">
                  {formatUsd(t.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Allocation label="Winner Payout" value={POOL_ALLOCATION.winnerPayout} highlight />
        <Allocation label="Free Daily Entries" value={POOL_ALLOCATION.freeDailyEntries} />
        <Allocation label="Jackpot" value={POOL_ALLOCATION.jackpot} />
        <Allocation label="Burn / Treasury" value={POOL_ALLOCATION.burnTreasury} />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Amounts are USD-denominated and paid in $BLOBBIE when live. Total winner
        payout {formatUsd(POOL_ALLOCATION.winnerPayout)} across {TOTAL_WINNERS}{" "}
        winners.
      </p>
    </div>
  );
}

function Allocation({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-neon-cyan/30 bg-neon-cyan/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-bold text-white">{formatUsd(value)}</p>
    </div>
  );
}
