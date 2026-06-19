import "server-only";
import { createHash, randomBytes } from "crypto";
import { socialConfig } from "./config";
import { detectFollow } from "./pure";

export { detectFollow };

/**
 * X (Twitter) OAuth 2.0 Authorization Code Flow with PKCE + follow verification
 * via the official X API. Network helpers fail closed (return null/false) so a
 * task is never confirmed when the API is missing, rate-limited or erroring.
 */

const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64url(randomBytes(16));
}

export function buildAuthorizeUrl(state: string, challenge: string): string {
  const { clientId, redirectUri, scopes } = socialConfig.x;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type XTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
};

export async function exchangeCodeForToken(
  code: string,
  verifier: string,
): Promise<XTokens | null> {
  const { clientId, clientSecret, redirectUri, apiBaseUrl } = socialConfig.x;
  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(`${apiBaseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
        client_id: clientId,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) return null;
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresIn: json.expires_in ?? null,
    };
  } catch {
    return null;
  }
}

export async function fetchXUser(
  accessToken: string,
): Promise<{ id: string; username: string } | null> {
  try {
    const res = await fetch(
      `${socialConfig.x.apiBaseUrl}/users/me?user.fields=username`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { id: string; username: string };
    };
    if (!json.data?.id) return null;
    return { id: json.data.id, username: json.data.username };
  } catch {
    return null;
  }
}

/** Resolve the target account id from config, or look it up by username. */
export async function resolveTargetUserId(): Promise<string | null> {
  const { targetUserId, targetUsername, apiBaseUrl, bearerToken } = socialConfig.x;
  if (targetUserId) return targetUserId;
  if (!bearerToken || !targetUsername) return null;
  try {
    const res = await fetch(
      `${apiBaseUrl}/users/by/username/${encodeURIComponent(targetUsername)}`,
      { headers: { Authorization: `Bearer ${bearerToken}` }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { id: string } };
    return json.data?.id ?? null;
  } catch {
    return null;
  }
}

export type FollowCheck = {
  follows: boolean;
  available: boolean; // false when the API was unreachable/rate-limited
};

/**
 * Check whether `meId` follows `targetId` using the user's access token.
 * Paginates the /following list (capped) and fails closed if unavailable.
 */
export async function checkFollows(
  meId: string,
  targetId: string,
  accessToken: string,
): Promise<FollowCheck> {
  const { apiBaseUrl } = socialConfig.x;
  if (!targetId) return { follows: false, available: false };
  try {
    let next: string | undefined;
    for (let page = 0; page < 15; page++) {
      const url = new URL(`${apiBaseUrl}/users/${meId}/following`);
      url.searchParams.set("max_results", "1000");
      if (next) url.searchParams.set("pagination_token", next);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (res.status === 429) return { follows: false, available: false };
      if (!res.ok) return { follows: false, available: false };
      const json = (await res.json()) as {
        data?: { id: string }[];
        meta?: { next_token?: string };
      };
      const ids = (json.data ?? []).map((u) => u.id);
      if (detectFollow(ids, targetId)) return { follows: true, available: true };
      next = json.meta?.next_token;
      if (!next) break;
    }
    return { follows: false, available: true };
  } catch {
    return { follows: false, available: false };
  }
}
