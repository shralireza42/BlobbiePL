import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
}

export function rateLimited(resetAt: number) {
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
    },
  );
}

export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    const flat = err.flatten();
    // Build a human-readable message from the first few field errors so the
    // client can show what actually needs fixing (not just "Validation failed").
    const fieldMsgs = Object.entries(flat.fieldErrors)
      .flatMap(([field, msgs]) => (msgs ?? []).map((m) => `${field}: ${m}`))
      .concat(flat.formErrors);
    const message =
      fieldMsgs.length > 0 ? fieldMsgs.slice(0, 4).join("; ") : "Validation failed";
    return fail(message, 422, flat);
  }
  if (err instanceof Error) {
    if (err.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (err.message === "NO_DB") return fail("Database not configured", 503);
  }
  console.error("[api] unhandled error", err);
  return fail("Internal server error", 500);
}
