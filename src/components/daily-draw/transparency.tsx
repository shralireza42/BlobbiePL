import { config, bscScanAddress } from "@/lib/config";
import { shortenAddress } from "@/lib/format";

export function Transparency() {
  const rows = [
    { label: "$BLOBBIE Token", address: config.addresses.token },
    { label: "Daily Draw Contract", address: config.addresses.dailyDraw },
    { label: "Operational Wallet", address: config.addresses.operational },
    { label: "Burn Address", address: config.addresses.burn },
    { label: "Jackpot Address", address: config.addresses.jackpot },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-cream">Transparency</h3>
        <span className="text-xs text-cream-dim">
          {config.isTestnet ? "BNB Testnet" : "BNB Chain"}
        </span>
      </div>
      <div className="mt-4 divide-y divide-cream/5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 py-3"
          >
            <span className="text-sm text-cream-dim">{row.label}</span>
            {row.address ? (
              <a
                href={bscScanAddress(row.address)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm text-neon-cyan hover:underline"
              >
                {shortenAddress(row.address, 6)} ↗
              </a>
            ) : (
              <span className="text-xs text-cream-dim">Not configured yet</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
