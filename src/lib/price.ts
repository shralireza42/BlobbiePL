import { config } from "./config";

export type PriceSource = "oracle" | "config-mock";

export type BlobbiePrice = {
  /** USD price of 1 $BLOBBIE. */
  usd: number;
  source: PriceSource;
  /** True when the price is a mock/beta value, not a real oracle. */
  isMock: boolean;
};

/**
 * Resolve the $BLOBBIE/USD price.
 *
 * Ticket cost is ALWAYS derived from this price — never hardcoded as
 * 1 BLOBBIE = 1 ticket. When no oracle is configured we fall back to the
 * mock price and flag it clearly so the UI can show a beta label.
 *
 * To wire a real oracle (e.g. Chainlink/Pyth) later, replace the body with
 * an on-chain read and return source: "oracle", isMock: false.
 */
export async function getBlobbiePrice(): Promise<BlobbiePrice> {
  // Future: read from on-chain price feed when token + feed are configured.
  // For the beta we use a configurable mock price.
  return {
    usd: config.mockPriceUsd > 0 ? config.mockPriceUsd : 0.0025,
    source: "config-mock",
    isMock: true,
  };
}

/** Number of $BLOBBIE tokens needed for a given USD amount. */
export function tokensForUsd(usd: number, priceUsd: number): number {
  if (priceUsd <= 0) return 0;
  return usd / priceUsd;
}
