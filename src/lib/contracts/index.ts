import { config } from "../config";
import { MockDrawProvider } from "./mock-provider";
import { RealDrawProvider } from "./real-provider";
import type { DrawProvider } from "./types";

export * from "./types";

let cached: DrawProvider | null = null;

/**
 * Provider factory — the single switch point between mock and real contracts.
 *
 * Real provider is used ONLY when mock mode is disabled AND the Daily Draw
 * contract address is configured. Otherwise we stay in Beta Mock Mode so the
 * UI never fakes a real transaction.
 */
export function getDrawProvider(): DrawProvider {
  if (cached) return cached;
  if (!config.isMockMode && config.addresses.dailyDraw) {
    cached = new RealDrawProvider();
  } else {
    cached = new MockDrawProvider();
  }
  return cached;
}

export function isMockMode(): boolean {
  return getDrawProvider().isMock;
}
