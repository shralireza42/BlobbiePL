import { cookies } from "next/headers";
import { ok, fail, handleError, rateLimited } from "@/lib/api";
import { loginVerifySchema } from "@/lib/validation";
import {
  verifyWalletSignature,
  createToken,
  setSessionCookie,
} from "@/lib/auth";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { isAdminWallet } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const id = clientIdentifier(req);
    const rl = rateLimit(id, { limit: 15, windowMs: 60_000, bucket: "auth-verify" });
    if (!rl.ok) return rateLimited(rl.resetAt);

    const body = await req.json();
    const { wallet, message, signature } = loginVerifySchema.parse(body);

    const nonce = cookies().get("blobbie_nonce")?.value;
    if (!nonce || !message.includes(nonce)) {
      return fail("Invalid or expired nonce. Please retry.", 401);
    }

    const valid = await verifyWalletSignature({ wallet, message, signature });
    if (!valid) return fail("Signature verification failed.", 401);

    const token = createToken(wallet);
    setSessionCookie(token);
    cookies().delete("blobbie_nonce");

    return ok({ wallet, isAdmin: isAdminWallet(wallet) });
  } catch (err) {
    return handleError(err);
  }
}
