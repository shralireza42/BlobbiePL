"use client";

import { useEffect, useRef } from "react";
import { useWalletSession } from "@/hooks/useWalletSession";
import { postJson } from "@/lib/client-api";

const KEY = "blobbie:ref";

/**
 * Captures a `?ref=CODE` from the URL into localStorage, then claims it once the
 * wallet is verified (both the referrer and the new friend get points).
 */
export function ReferralCapture() {
  const { session } = useWalletSession();
  const claimed = useRef(false);

  // Capture the code as early as possible.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      try {
        localStorage.setItem(KEY, ref);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Claim once authenticated.
  useEffect(() => {
    if (!session.authenticated || !session.wallet || claimed.current) return;
    let code: string | null = null;
    try {
      code = localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    if (!code) return;
    claimed.current = true;
    postJson("/api/referral/claim", { code })
      .catch(() => {})
      .finally(() => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
      });
  }, [session.authenticated, session.wallet]);

  return null;
}
