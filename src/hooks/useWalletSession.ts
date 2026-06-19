"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChainId,
  useSignMessage,
} from "wagmi";
import { config as appConfig } from "@/lib/config";

type SessionState = {
  authenticated: boolean;
  wallet: string | null;
  isAdmin: boolean;
};

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export function useWalletSession() {
  const { address, isConnected, connector } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const activeChainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const [session, setSession] = useState<SessionState>({
    authenticated: false,
    wallet: null,
    isAdmin: false,
  });
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrongNetwork = isConnected && activeChainId !== appConfig.chainId;

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const json = await res.json();
      if (json.ok) setSession(json.data);
    } catch {
      /* noop */
    } finally {
      setSessionChecked(true);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const connect = useCallback(
    async (connectorId?: string) => {
      setError(null);
      try {
        const target =
          connectors.find((c) => c.id === connectorId) ?? connectors[0];
        if (!target) throw new Error("No wallet connector available");
        await connectAsync({ connector: target });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to connect wallet");
      }
    },
    [connectAsync, connectors],
  );

  const switchNetwork = useCallback(async () => {
    setError(null);
    try {
      await switchChainAsync({ chainId: appConfig.chainId as 56 | 97 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to switch network");
    }
  }, [switchChainAsync]);

  const signIn = useCallback(async () => {
    if (!address) return;
    setIsSigningIn(true);
    setError(null);
    try {
      const nonceRes = await postJson("/api/auth/nonce", { wallet: address });
      if (!nonceRes.ok) throw new Error(nonceRes.error ?? "Failed to get nonce");
      const message: string = nonceRes.data.message;
      const signature = await signMessageAsync({ message });
      const verifyRes = await postJson("/api/auth/verify", {
        wallet: address,
        message,
        signature,
      });
      if (!verifyRes.ok)
        throw new Error(verifyRes.error ?? "Signature verification failed");
      await refreshSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setIsSigningIn(false);
    }
  }, [address, signMessageAsync, refreshSession]);

  const signOut = useCallback(async () => {
    await postJson("/api/auth/logout");
    await disconnectAsync();
    setSession({ authenticated: false, wallet: null, isAdmin: false });
  }, [disconnectAsync]);

  // Auto sign-in only AFTER we've confirmed there is no valid existing session.
  // This prevents a signature prompt firing on every page navigation when the
  // wallet is already verified (the httpOnly session cookie persists).
  useEffect(() => {
    if (!sessionChecked) return;
    if (!isConnected || !address || wrongNetwork || isSigningIn) return;

    const sameWallet =
      session.authenticated &&
      session.wallet &&
      session.wallet.toLowerCase() === address.toLowerCase();

    // Already verified for this wallet — do nothing on navigation.
    if (sameWallet) return;

    signIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionChecked, isConnected, address, wrongNetwork, session.authenticated, session.wallet]);

  return {
    address: address ?? null,
    isConnected,
    connector,
    connectors,
    connect,
    isConnecting,
    wrongNetwork,
    switchNetwork,
    isSwitching,
    signIn,
    isSigningIn,
    signOut,
    session,
    refreshSession,
    error,
    chainId: appConfig.chainId,
  };
}
