"use client";

import { useEffect, useRef } from "react";
import { postJson } from "@/lib/client-api";
import { useWalletSession } from "./useWalletSession";

/**
 * Fires a one-time airdrop task claim when an authenticated wallet visits a
 * page. Points are still validated + awarded server-side; duplicate claims are
 * rejected by the API, so this is safe to call on every mount.
 */
export function useAutoTask(taskKey: string) {
  const { session } = useWalletSession();
  const fired = useRef<string | null>(null);

  useEffect(() => {
    if (!session.authenticated || !session.wallet) return;
    const id = `${session.wallet}:${taskKey}`;
    if (fired.current === id) return;
    fired.current = id;
    postJson("/api/airdrop/claim", { taskKey }).catch(() => {});
  }, [session.authenticated, session.wallet, taskKey]);
}

export function AutoTask({ taskKey }: { taskKey: string }) {
  useAutoTask(taskKey);
  return null;
}
