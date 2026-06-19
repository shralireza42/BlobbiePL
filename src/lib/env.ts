/**
 * Server-only environment access. Importing this from a client component will
 * throw at build time because of the values it reads.
 */
import "server-only";

export const serverEnv = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
  adminWallets: (process.env.ADMIN_WALLET_ADDRESS ?? "")
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean),
};

export function isAdminWallet(wallet?: string | null): boolean {
  if (!wallet) return false;
  return serverEnv.adminWallets.includes(wallet.toLowerCase());
}
