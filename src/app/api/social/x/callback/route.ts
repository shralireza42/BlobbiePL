import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { xConfigured } from "@/lib/social/config";
import { exchangeCodeForToken, fetchXUser } from "@/lib/social/x";
import { encryptToken } from "@/lib/social/crypto";
import { getOrCreateUser, linkSocialAccount } from "@/lib/services/social";

export const dynamic = "force-dynamic";

function back(query: string) {
  return NextResponse.redirect(`${config.siteUrl}/airdrop?${query}`);
}

export async function GET(req: Request) {
  const jar = cookies();
  const expectedState = jar.get("x_oauth_state")?.value;
  const verifier = jar.get("x_oauth_verifier")?.value;
  jar.delete("x_oauth_state");
  jar.delete("x_oauth_verifier");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error");

  if (denied) return back("x=denied");

  const session = getSession();
  if (!session?.wallet) return back("x=error&reason=wallet");
  if (!xConfigured()) return back("x=unavailable");
  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return back("x=error&reason=state");
  }

  const tokens = await exchangeCodeForToken(code, verifier);
  if (!tokens) return back("x=unavailable");

  const profile = await fetchXUser(tokens.accessToken);
  if (!profile) return back("x=unavailable");

  const user = await getOrCreateUser(session.wallet);
  const link = await linkSocialAccount({
    userId: user.id,
    provider: "X",
    providerUserId: profile.id,
    username: profile.username,
    accessTokenEncrypted: encryptToken(tokens.accessToken),
    refreshTokenEncrypted: encryptToken(tokens.refreshToken),
  });
  if (!link.ok) return back("x=error&reason=linked");

  return back("x=connected");
}
