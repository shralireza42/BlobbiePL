/**
 * Public (client-safe) configuration derived from NEXT_PUBLIC_* env vars.
 * Never put secrets here — this module is imported by client components.
 */

function isAddress(value: string | undefined): value is `0x${string}` {
  return !!value && /^0x[a-fA-F0-9]{40}$/.test(value);
}

const RAW = {
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID,
  tokenAddress: process.env.NEXT_PUBLIC_BLOBBIE_TOKEN_ADDRESS,
  dailyDrawAddress: process.env.NEXT_PUBLIC_DAILY_DRAW_CONTRACT_ADDRESS,
  jackpotAddress: process.env.NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS,
  operationalWallet: process.env.NEXT_PUBLIC_OPERATIONAL_WALLET_ADDRESS,
  burnAddress: process.env.NEXT_PUBLIC_BURN_ADDRESS,
  walletConnectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  enableMockMode: process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE,
  enableTicketPurchase: process.env.NEXT_PUBLIC_ENABLE_TICKET_PURCHASE,
  mockPriceUsd: process.env.NEXT_PUBLIC_MOCK_BLOBBIE_PRICE_USD,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
};

const chainId = Number(RAW.chainId ?? 97);

const tokenAddress = isAddress(RAW.tokenAddress) ? RAW.tokenAddress : null;
const dailyDrawAddress = isAddress(RAW.dailyDrawAddress)
  ? RAW.dailyDrawAddress
  : null;

/**
 * Mock mode is ON when explicitly enabled OR when the core contracts are not
 * configured. This guarantees we never pretend a real tx happened.
 */
const explicitMock = RAW.enableMockMode !== "false";
const contractsConfigured = !!tokenAddress && !!dailyDrawAddress;
const isMockMode = explicitMock || !contractsConfigured;

export const config = {
  chainId,
  isTestnet: chainId !== 56,
  addresses: {
    token: tokenAddress,
    dailyDraw: dailyDrawAddress,
    jackpot: isAddress(RAW.jackpotAddress) ? RAW.jackpotAddress : null,
    operational: isAddress(RAW.operationalWallet)
      ? RAW.operationalWallet
      : null,
    burn: isAddress(RAW.burnAddress) ? RAW.burnAddress : null,
  },
  walletConnectId: RAW.walletConnectId || "",
  isMockMode,
  contractsConfigured,
  ticketPurchaseEnabled: RAW.enableTicketPurchase !== "false",
  mockPriceUsd: Number(RAW.mockPriceUsd ?? 0.0025),
  siteUrl: RAW.siteUrl || "http://localhost:3000",
} as const;

export type AppConfig = typeof config;

/** BscScan base url for the active chain. */
export const bscScanBase =
  chainId === 56
    ? "https://bscscan.com"
    : "https://testnet.bscscan.com";

export function bscScanAddress(address: string) {
  return `${bscScanBase}/address/${address}`;
}

export function bscScanTx(hash: string) {
  return `${bscScanBase}/tx/${hash}`;
}
