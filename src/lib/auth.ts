import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { verifyMessage } from "viem";
import { serverEnv, isAdminWallet } from "./env";

/**
 * Minimal wallet-signature session.
 *
 * Login flow: client requests a nonce -> user signs the message -> server
 * verifies the signature with viem and issues an HMAC-signed session token
 * stored in an httpOnly cookie. No private keys ever touch the server.
 */

const COOKIE_NAME = "blobbie_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type Session = {
  wallet: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(payload: string): string {
  return base64url(
    createHmac("sha256", serverEnv.jwtSecret).update(payload).digest(),
  );
}

export function createToken(wallet: string): string {
  const now = Date.now();
  const session: Session = {
    wallet: wallet.toLowerCase(),
    isAdmin: isAdminWallet(wallet),
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const body = base64url(JSON.stringify(session));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token?: string | null): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(
      Buffer.from(body, "base64").toString("utf8"),
    ) as Session;
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function buildSignMessage(wallet: string, nonce: string): string {
  return [
    "Blobbie Playground wants you to sign in.",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    "",
    "Signing is gas-free and only proves wallet ownership.",
  ].join("\n");
}

export async function verifyWalletSignature(args: {
  wallet: string;
  message: string;
  signature: string;
}): Promise<boolean> {
  try {
    return await verifyMessage({
      address: args.wallet as `0x${string}`,
      message: args.message,
      signature: args.signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

export function newNonce(): string {
  return randomBytes(16).toString("hex");
}

// ---- cookie helpers (server actions / route handlers) ----

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export function getSession(): Session | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifyToken(token);
}

export function getSessionFromRequest(req: Request): Session | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return verifyToken(match?.[1]);
}

export function requireAdmin(): Session {
  const session = getSession();
  if (!session || !session.isAdmin) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export { COOKIE_NAME };
