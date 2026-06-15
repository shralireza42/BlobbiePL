import { ok, handleError } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    clearSessionCookie();
    return ok({ loggedOut: true });
  } catch (err) {
    return handleError(err);
  }
}
