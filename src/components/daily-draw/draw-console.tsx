"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWalletSession } from "@/hooks/useWalletSession";
import { useBlobbieBalance } from "@/hooks/useBlobbieBalance";
import { useCountdown } from "@/hooks/useCountdown";
import { getJson, postJson } from "@/lib/client-api";
import { formatUsd, formatNumber, formatCountdown, shortenAddress } from "@/lib/format";
import { ROUND_STATUS_LABELS, MAX_TICKETS_PER_TX } from "@/lib/constants";
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
};

type CurrentResponse = {
  round: RoundInfo;
  price: { usd: number; isMock: boolean; source: string };
  userTickets: number;
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

function ticketStorageKey(wallet: string | null, round: number) {
  return `blobbie:tickets:${wallet ?? "anon"}:${round}`;
}

export function DrawConsole() {
  const { address, isConnected, wrongNetwork, session } = useWalletSession();
  const { configured: tokenConfigured, balance } = useBlobbieBalance(address);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["draw-current", session.wallet],
    queryFn: () => getJson<CurrentResponse>("/api/draw/current"),
    refetchInterval: 15_000,
  });

  // Locally accumulated tickets for the current round. In Beta Mock Mode the
  // backend simulates purchases, so we reflect the user's own tickets (and
  // their participation) in the UI here. Persisted so it survives refetch.
  const [localTickets, setLocalTickets] = useState(0);
  const roundNumber = data?.round.roundNumber ?? null;

  useEffect(() => {
    if (roundNumber == null || typeof window === "undefined") return;
    const raw = window.localStorage.getItem(
      ticketStorageKey(session.wallet, roundNumber),
    );
    setLocalTickets(raw ? Number(raw) || 0 : 0);
  }, [roundNumber, session.wallet]);

  const addLocalTickets = (count: number) => {
    if (roundNumber == null) return;
    setLocalTickets((prev) => {
      const next = prev + count;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          ticketStorageKey(session.wallet, roundNumber),
          String(next),
        );
      }
      return next;
    });
  };

  const mergedData: CurrentResponse | null = useMemo(() => {
    if (!data) return null;
    if (localTickets <= 0) return data;
    const alreadyCounted = data.userTickets > 0;
    const userTickets = data.userTickets + localTickets;
    return {
      ...data,
      userTickets,
      round: {
        ...data.round,
        participants: data.round.participants + (alreadyCounted ? 0 : 1),
        totalTickets: data.round.totalTickets + localTickets,
      },
    };
  }, [data, localTickets]);

  if (isLoading || !data || !mergedData) {
    return <ConsoleSkeleton />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <RoundCard data={mergedData} />
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
          data={mergedData}
          canBuy={isConnected && !wrongNetwork && session.authenticated}
          onPurchased={(count) => {
            addLocalTickets(count);
            refetch();
          }}
        />
      </div>
    </div>
  );
}

function RoundCard({ data }: { data: CurrentResponse }) {
  const { round, userTickets } = data;
  const { remaining } = useCountdown(round.endTime);
  const pct = Math.min(100, (round.participants / round.capacity) * 100);

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

      <div className="mt-6">
        <div className="flex items-end justify-between">
          <p className="stat-label">Participants</p>
          <p className="text-sm text-cream-soft">
            <span className="text-xl font-bold text-cream">
              {round.participants}
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
        {round.supplementTickets > 0 && (
          <p className="mt-2 text-xs text-cream-dim">
            {round.supplementTickets} supplementary ticket-equivalents top up the
            pool. They are not eligible to win.
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Closes In" value={formatCountdown(remaining)} mono />
        <Metric label="Your Tickets" value={String(userTickets)} />
        <Metric label="Total Tickets" value={formatNumber(round.totalTickets, 0)} />
        <Metric label="Pool" value={formatUsd(round.poolUsd)} />
      </div>

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
}: {
  data: CurrentResponse;
  canBuy: boolean;
  onPurchased: (count: number) => void;
}) {
  const [count, setCount] = useState(1);
  const [tx, setTx] = useState<TxState>({ phase: "idle" });

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

  const purchaseDisabled =
    !canBuy ||
    !data.ticketPurchaseEnabled ||
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

      <label className="mt-4 block text-xs uppercase tracking-wider text-cream-dim">
        Ticket quantity
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
          max={MAX_TICKETS_PER_TX}
          value={count}
          onChange={(e) =>
            setCount(
              Math.max(1, Math.min(MAX_TICKETS_PER_TX, Number(e.target.value) || 1)),
            )
          }
          className="input text-center"
        />
        <button
          className="btn-ghost px-3 py-2"
          onClick={() => setCount((c) => Math.min(MAX_TICKETS_PER_TX, c + 1))}
        >
          +
        </button>
      </div>

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
