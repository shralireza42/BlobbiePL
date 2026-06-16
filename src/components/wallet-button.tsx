"use client";

import { useState } from "react";
import { useWalletSession } from "@/hooks/useWalletSession";
import { shortenAddress } from "@/lib/format";

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const {
    address,
    isConnected,
    connect,
    connectors,
    isConnecting,
    wrongNetwork,
    switchNetwork,
    isSwitching,
    signOut,
    session,
  } = useWalletSession();
  const [open, setOpen] = useState(false);

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          className="btn-accent"
          onClick={() => setOpen((o) => !o)}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </button>
        {open && (
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-cream/10 bg-bg-card p-2 shadow-glow">
            <p className="px-3 py-2 text-xs text-cream-dim">Choose a wallet</p>
            {connectors.map((c) => (
              <button
                key={c.uid}
                onClick={() => {
                  connect(c.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-cream hover:bg-cream/10"
              >
                {c.name}
              </button>
            ))}
            <p className="px-3 pt-2 text-[10px] text-cream-dim">
              MetaMask · Trust Wallet · WalletConnect
            </p>
          </div>
        )}
      </div>
    );
  }

  if (wrongNetwork) {
    return (
      <button
        className="btn bg-amber-400 text-ink shadow-sticker hover:-translate-y-0.5"
        onClick={switchNetwork}
        disabled={isSwitching}
      >
        {isSwitching ? "Switching…" : "Switch Network"}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-2 rounded-pill border-2 border-ink bg-paper px-4 py-2 text-sm font-extrabold not-italic text-ink shadow-sticker-sm transition hover:-translate-y-0.5"
        style={{ fontFamily: "var(--font-display)" }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {shortenAddress(address)}
        {session.isAdmin && !compact && (
          <span className="ml-1 rounded bg-ink px-1.5 py-0.5 text-[10px] text-paper">
            ADMIN
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-cream/10 bg-bg-card p-2 shadow-glow">
          <p className="truncate px-3 py-2 text-xs text-cream-dim">{address}</p>
          {!session.authenticated && (
            <p className="px-3 py-1 text-[11px] text-amber-300">Sign message to verify</p>
          )}
          <button
            onClick={() => {
              signOut();
              setOpen(false);
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-cream hover:bg-cream/10"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
