"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { config } from "@/lib/config";
import { erc20Abi } from "@/lib/contracts/abi";

export function useBlobbieBalance(address?: string | null) {
  const token = config.addresses.token;

  const { data: rawBalance, isLoading } = useReadContract({
    address: token ?? undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!token && !!address },
  });

  const { data: decimals } = useReadContract({
    address: token ?? undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: !!token },
  });

  const configured = !!token;
  const balance =
    configured && rawBalance !== undefined
      ? Number(formatUnits(rawBalance as bigint, Number(decimals ?? 18)))
      : null;

  return { configured, balance, isLoading: configured && isLoading };
}
