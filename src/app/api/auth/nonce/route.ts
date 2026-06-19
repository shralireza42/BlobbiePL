import { cookies } from "next/headers";
import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { loginNonceSchema } from "@/lib/validation";
import { buildSignMessage, newNonce } from "@/lib/auth";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const id = clientIdentifier(req);
    const rl = rateLimit(id, { limit: 20, windowMs: 60_000, bucket: "auth-nonce" });
    if (!rl.ok) return rateLimited(rl.resetAt);

    const body = await req.json();
    const { wallet } = loginNonceSchema.parse(body);
    const nonce = newNonce();
    const message = buildSignMessage(wallet, nonce);

    cookies().set("blobbie_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    });

    return ok({ message, nonce });
  } catch (err) {
    return handleError(err);
  }
}
