"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWalletSession } from "@/hooks/useWalletSession";
import { useBlobbieBalance } from "@/hooks/useBlobbieBalance";
import { useCountdown } from "@/hooks/useCountdown";
import { getJson, postJson } from "@/lib/client-api";
import { formatUsd, formatNumber, formatCountdown, shortenAddress } from "@/lib/format";
import { ROUND_STATUS_LABELS, MAX_TICKETS_PER_TX, MAX_TICKETS_PER_USER } from "@/lib/constants";
import { bscScanTx } from "@/lib/config";
import { WalletButton } from "@/components/wallet-button";

type RoundInfo = {
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
  cooldownEndsAt?: number | null;
  purchaseOpen?: boolean;
  randomSeed?: string | null;
  vrfRequestId?: string | null;
};

type Odds = {
  ticketsSold: number;
  capacity: number;
  supplementTickets: number;
  scalePct: number;
  userTickets: number;
  winChancePct: number;
  expectedUsd: number;
  topPrizeUsd: number;
  scaledWinnerPayoutUsd: number;
};

type CurrentResponse = {
  round: RoundInfo;
  price: { usd: number; isMock: boolean; source: string };
  userTickets: number;
  odds: Odds;
  isMockMode: boolean;
  ticketPurchaseEnabled: boolean;
  tokenConfigured: boolean;
};

type TxState =
  | { phase: "idle" }
  | { phase: "approving" }
  | { phase: "buying" }
  | { phase: "success"; message: string; isReal: boolean; hash?: string | null }
  | { phase: "error"; message: string };

const STATUS_STYLES: Record<string, string> = {
  OPEN: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  CLOSING_SOON: "border-gold/30 bg-gold/10 text-gold",
  FILLED: "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan",
  AWAITING_DRAW: "border-neon-purple/30 bg-neon-purple/10 text-neon-purple",
  COMPLETED: "border-cream/15 bg-cream/5 text-cream-soft",
};

export function DrawConsole() {
  const { address, isConnected, wrongNetwork, session } = useWalletSession();
  const { configured: tokenConfigured, balance } = useBlobbieBalance(address);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["draw-current", session.wallet],
    queryFn: () => getJson<CurrentResponse>("/api/draw/current"),
    refetchInterval: 15_000,
  });

  if (isLoading || !data) {
    return <ConsoleSkeleton />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <RoundCard data={data} />
      </div>
      <div className="space-y-6">
        <WalletPanel
          isConnected={isConnected}
          wrongNetwork={wrongNetwork}
          address={address}
          authenticated={session.authenticated}
          tokenConfigured={tokenConfigured}
          balance={balance}
        />
        <PurchasePanel
          data={data}
          canBuy={isConnected && !wrongNetwork && session.authenticated}
          balance={balance}
          tokenConfigured={tokenConfigured}
          isOwner={session.role === "OWNER"}
          onPurchased={() => {
            // Server records the entry; refetch to reflect new counts.
            refetch();
          }}
        />
      </div>
    </div>
  );
}

function RoundCard({ data }: { data: CurrentResponse }) {
  const { round, userTickets, odds } = data;
  const { remaining } = useCountdown(round.endTime);
  // The round fills at 300 TICKETS (1 ticket = 1 entry).
  const pct = Math.min(100, (round.totalTickets / round.capacity) * 100);

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="stat-label">Round</p>
          <p className="text-2xl font-bold text-cream">#{round.roundNumber}</p>
        </div>
        <span className={`chip ${STATUS_STYLES[round.status]}`}>
          {ROUND_STATUS_LABELS[round.status]}
        </span>
      </div>

      {round.status === "AWAITING_DRAW" && (
        <DrawingBanner cooldownEndsAt={round.cooldownEndsAt} seed={round.randomSeed} />
      )}

      <div className="mt-6">
        <div className="flex items-end justify-between">
          <p className="stat-label">Tickets sold</p>
          <p className="text-sm text-cream-soft">
            <span className="text-xl font-bold text-cream">
              {round.totalTickets}
            </span>
            /{round.capacity}
          </p>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-cream/5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              backgroundImage:
                "linear-gradient(90deg, #a8830a 0%, #fcd535 45%, #fff3b0 100%)",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-cream-dim">
          1 ticket = 1 entry. The round closes when 300 tickets sell or after 24h.
          {round.supplementTickets > 0 && (
            <>
              {" "}If fewer than 300 sell, the operational wallet supplies the
              remaining {round.supplementTickets} ticket
              {round.supplementTickets === 1 ? "" : "s"} — these are never
              eligible to win and prizes scale to the real tickets sold.
            </>
          )}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Closes In" value={formatCountdown(remaining)} mono />
        <Metric label="Your Tickets" value={String(userTickets)} />
        <Metric label="Players" value={formatNumber(round.participants, 0)} />
        <Metric label="Pool" value={formatUsd(round.poolUsd)} />
      </div>

      <UserOdds odds={odds} />

      <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-cream-dim">
        <div className="rounded-lg border border-cream/10 bg-cream/5 p-3">
          <p className="stat-label">Start</p>
          <p className="mt-1 text-cream">
            {new Date(round.startTime).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-cream/10 bg-cream/5 p-3">
          <p className="stat-label">End</p>
          <p className="mt-1 text-cream">
            {new Date(round.endTime).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function DrawingBanner({
  cooldownEndsAt,
  seed,
}: {
  cooldownEndsAt?: number | null;
  seed?: string | null;
}) {
  const { remaining } = useCountdown(cooldownEndsAt ?? null);
  return (
    <div className="mt-4 rounded-2xl border border-accent-lime/40 bg-accent-lime/10 p-4">
      <p className="font-display not-italic text-cream">
        🎲 Drawing winners… next round opens in{" "}
        <span className="font-mono">{formatCountdown(remaining)}</span>
      </p>
      <p className="mt-1 text-xs not-italic text-cream-dim">
        Purchases are paused during the 3-minute draw window.
        {seed && (
          <>
            {" "}Verifiable seed:{" "}
            <span className="font-mono text-cream-soft">{seed.slice(0, 18)}…</span>
          </>
        )}
      </p>
    </div>
  );
}

function UserOdds({ odds }: { odds: Odds }) {
  const hasTickets = odds.userTickets > 0;
  return (
    <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5">
      <div className="flex items-center justify-between">
        <h4 className="font-display not-italic text-base text-cream">
          Your Odds &amp; Winnings
        </h4>
        <span className="text-xs not-italic text-cream-dim">
          {odds.ticketsSold} eligible tickets
        </span>
      </div>
      {!hasTickets ? (
        <p className="mt-2 text-sm text-cream-dim">
          Buy at least one ticket to see your win chance and estimated winnings.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Win chance" value={`${odds.winChancePct.toFixed(1)}%`} />
          <Metric label="Est. winnings" value={formatUsd(odds.expectedUsd)} />
          <Metric label="Top prize" value={formatUsd(odds.topPrizeUsd)} />
          <Metric
            label="Scaled pool"
            value={formatUsd(odds.scaledWinnerPayoutUsd)}
          />
        </div>
      )}
      <p className="mt-3 text-xs text-cream-dim">
        Shown for a full 300-ticket round. Winners are drawn randomly from real
        tickets only; if a round closes with fewer tickets, actual prizes scale
        with the real tickets sold.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-cream/10 bg-cream/5 p-3">
      <p className="stat-label">{label}</p>
      <p className={`mt-1 font-bold text-cream ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function WalletPanel({
  isConnected,
  wrongNetwork,
  address,
  authenticated,
  tokenConfigured,
  balance,
}: {
  isConnected: boolean;
  wrongNetwork: boolean;
  address: string | null;
  authenticated: boolean;
  tokenConfigured: boolean;
  balance: number | null;
}) {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-cream">Wallet</h3>
      {!isConnected ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-cream-dim">
            Connect MetaMask, Trust Wallet or WalletConnect to join.
          </p>
          <WalletButton />
        </div>
      ) : wrongNetwork ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-gold">Wrong network detected.</p>
          <WalletButton />
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          <Row label="Address" value={shortenAddress(address, 6)} />
          <Row
            label="Session"
            value={
              authenticated ? (
                <span className="text-emerald-300">Verified</span>
              ) : (
                <span className="text-gold">Sign to verify</span>
              )
            }
          />
          <Row
            label="$BLOBBIE Balance"
            value={
              tokenConfigured ? (
                balance !== null ? (
                  formatNumber(balance)
                ) : (
                  "…"
                )
              ) : (
                <span className="text-xs text-cream-dim">
                  Token contract not configured yet
                </span>
              )
            }
          />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-cream-dim">{label}</span>
      <span className="font-medium text-cream">{value}</span>
    </div>
  );
}

function PurchasePanel({
  data,
  canBuy,
  onPurchased,
  balance,
  tokenConfigured,
  isOwner,
}: {
  data: CurrentResponse;
  canBuy: boolean;
  onPurchased: (count: number) => void;
  balance: number | null;
  tokenConfigured: boolean;
  isOwner: boolean;
}) {
  const [count, setCount] = useState(1);
  const [tx, setTx] = useState<TxState>({ phase: "idle" });

  // Per-round caps: 50 tickets/user (300 for owners), and never beyond 300 total.
  const perUserCap = isOwner ? MAX_TICKETS_PER_TX : MAX_TICKETS_PER_USER;
  const userRemaining = Math.max(0, perUserCap - data.userTickets);
  const roundRemaining = Math.max(0, data.round.capacity - data.round.totalTickets);
  const maxAllowed = Math.max(0, Math.min(userRemaining, roundRemaining));

  // How many tickets the user's $BLOBBIE balance can cover (1 ticket = $1).
  // In Beta Mock Mode (no token configured) we let them fill up to the cap.
  const affordable =
    tokenConfigured && balance !== null && data.price.usd > 0
      ? Math.floor(balance * data.price.usd)
      : maxAllowed;

  const { data: quote } = useQuery({
    queryKey: ["draw-quote", count],
    queryFn: () =>
      getJson<{
        ticketCount: number;
        blobbieWei: string;
        usd: number;
        priceUsd: number;
        isMockPrice: boolean;
      }>(`/api/draw/quote?ticketCount=${count}`),
    enabled: count > 0,
  });

  const blobbieCost = useMemo(() => {
    if (!quote) return 0;
    return Number(quote.blobbieWei) / 1e18;
  }, [quote]);

  const roundOpen = data.round.purchaseOpen !== false && data.round.status === "OPEN";
  const purchaseDisabled =
    !canBuy ||
    !data.ticketPurchaseEnabled ||
    !roundOpen ||
    count < 1 ||
    tx.phase === "approving" ||
    tx.phase === "buying";

  async function handleBuy() {
    setTx({ phase: "approving" });
    // Simulate the approval step UX. In real mode the wallet would prompt.
    await new Promise((r) => setTimeout(r, 700));
    setTx({ phase: "buying" });
    const res = await postJson<{
      tx: { isReal: boolean; status: string; hash?: string | null; message?: string };
      airdrop?: { awarded: number } | null;
    }>("/api/draw/buy", { ticketCount: count });

    if (!res.ok || !res.data) {
      setTx({ phase: "error", message: res.error ?? "Purchase failed" });
      return;
    }
    const t = res.data.tx;
    if (t.status === "failed") {
      setTx({ phase: "error", message: t.message ?? "Purchase failed" });
      return;
    }
    const extra = res.data.airdrop?.awarded
      ? ` +${res.data.airdrop.awarded} Airdrop Points.`
      : "";
    setTx({
      phase: "success",
      isReal: t.isReal,
      hash: t.hash,
      message: (t.message ?? "Tickets purchased.") + extra,
    });
    onPurchased(count);
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-cream">Buy Tickets</h3>
      {data.isMockMode && (
        <p className="mt-2 rounded-lg border border-gold/20 bg-gold/5 p-2 text-xs text-gold">
          Beta Mock Mode — purchases are simulated. No real transaction occurs.
        </p>
      )}

      <label className="mt-4 flex items-center justify-between text-xs uppercase tracking-wider text-cream-dim">
        <span>Ticket quantity</span>
        <span className="not-italic normal-case">
          Max {maxAllowed} ({isOwner ? "owner" : `${MAX_TICKETS_PER_USER}/round`})
        </span>
      </label>
      <div className="mt-2 flex items-center gap-2">
        <button
          className="btn-ghost px-3 py-2"
          onClick={() => setCount((c) => Math.max(1, c - 1))}
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={maxAllowed || 1}
          value={count}
          onChange={(e) =>
            setCount(
              Math.max(
                1,
                Math.min(maxAllowed || 1, Number(e.target.value) || 1),
              ),
            )
          }
          className="input text-center"
        />
        <button
          className="btn-ghost px-3 py-2"
          onClick={() => setCount((c) => Math.min(maxAllowed || 1, c + 1))}
        >
          +
        </button>
      </div>

      <button
        className="btn-ghost mt-2 w-full py-2 text-sm disabled:opacity-50"
        disabled={maxAllowed < 1 || Math.min(affordable, maxAllowed) < 1}
        onClick={() => setCount(Math.max(1, Math.min(affordable, maxAllowed)))}
      >
        {tokenConfigured
          ? balance === null
            ? "Loading $BLOBBIE balance…"
            : `Use my $BLOBBIE — ${formatNumber(balance, 0)} ≈ ${affordable} ticket${affordable === 1 ? "" : "s"}`
          : `Use my $BLOBBIE (Beta) — max ${Math.min(affordable, maxAllowed)} ticket${Math.min(affordable, maxAllowed) === 1 ? "" : "s"}`}
      </button>
      {!tokenConfigured && (
        <p className="mt-1 text-[11px] not-italic text-cream-dim">
          Token not configured — $BLOBBIE purchases are simulated in Beta Mock Mode.
        </p>
      )}

      <div className="mt-4 space-y-2 rounded-xl border border-cream/10 bg-cream/5 p-4 text-sm">
        <Row label="USD equivalent" value={formatUsd(quote?.usd ?? count)} />
        <Row
          label="Estimated $BLOBBIE"
          value={quote ? formatNumber(blobbieCost, 2) : "…"}
        />
        <Row
          label="Price source"
          value={
            quote?.isMockPrice ? (
              <span className="text-gold">Mock price</span>
            ) : (
              <span className="text-emerald-300">Oracle</span>
            )
          }
        />
      </div>

      <div className="mt-4 space-y-2">
        <button
          className="btn-primary w-full"
          disabled={purchaseDisabled}
          onClick={handleBuy}
        >
          {tx.phase === "approving"
            ? "Approving $BLOBBIE…"
            : tx.phase === "buying"
              ? "Buying tickets…"
              : "Approve & Buy Tickets"}
        </button>
        {!canBuy && (
          <p className="text-xs text-cream-dim">
            Connect and verify your wallet on the correct network to buy.
          </p>
        )}
        {!data.ticketPurchaseEnabled && (
          <p className="text-xs text-gold">
            Ticket purchase is currently disabled by the admin.
          </p>
        )}
        {data.ticketPurchaseEnabled && !roundOpen && (
          <p className="text-xs text-gold">
            The round is drawing winners — buying reopens with the next round.
          </p>
        )}
      </div>

      {tx.phase === "success" && (
        <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
          {tx.message}
          {tx.isReal && tx.hash && (
            <a
              href={bscScanTx(tx.hash)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-neon-cyan hover:underline"
            >
              View on BscScan ↗
            </a>
          )}
        </div>
      )}
      {tx.phase === "error" && (
        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
          {tx.message}
        </div>
      )}
    </div>
  );
}

function ConsoleSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="skeleton h-80 w-full" />
      </div>
      <div className="space-y-6">
        <div className="skeleton h-40 w-full" />
        <div className="skeleton h-72 w-full" />
      </div>
    </div>
  );
}
