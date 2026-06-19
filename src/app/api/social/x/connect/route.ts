import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { xConfigured } from "@/lib/social/config";
import { buildAuthorizeUrl, generatePkce, generateState } from "@/lib/social/x";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

function back(query: string) {
  return NextResponse.redirect(`${config.siteUrl}/airdrop?${query}`);
}

export async function GET() {
  const session = getSession();
  if (!session?.wallet) return back("x=error&reason=wallet");
  if (!xConfigured()) return back("x=unavailable");

  const state = generateState();
  const { verifier, challenge } = generatePkce();

  const jar = cookies();
  jar.set("x_oauth_state", state, COOKIE_OPTS);
  jar.set("x_oauth_verifier", verifier, COOKIE_OPTS);

  return NextResponse.redirect(buildAuthorizeUrl(state, challenge));
}
