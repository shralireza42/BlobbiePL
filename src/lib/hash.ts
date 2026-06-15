import "server-only";
import { createHash } from "crypto";
import { serverEnv } from "./env";

/** One-way hash of IP/device identifiers for privacy-preserving sybil checks. */
export function privacyHash(value?: string | null): string | undefined {
  if (!value) return undefined;
  return createHash("sha256")
    .update(`${serverEnv.jwtSecret}:${value}`)
    .digest("hex")
    .slice(0, 32);
}
