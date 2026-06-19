import "server-only";

/**
 * Lightweight fixed-window rate limiter.
 *
 * Uses an in-memory store by default (fine for a single instance / beta). For
 * multi-instance deployments swap the store for the RateLimitHit Prisma model
 * or a Redis backend — the interface stays the same.
 */

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

export function rateLimit(
  identifier: string,
  opts: { limit: number; windowMs: number; bucket: string },
): RateLimitResult {
  const key = `${opts.bucket}:${identifier}`;
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: opts.limit - 1, resetAt, limit: opts.limit };
  }

  existing.count += 1;
  const ok = existing.count <= opts.limit;
  return {
    ok,
    remaining: Math.max(0, opts.limit - existing.count),
    resetAt: existing.resetAt,
    limit: opts.limit,
  };
}

/** Best-effort client identifier from request headers. */
export function clientIdentifier(req: Request, fallback = "anon"): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || fallback;
}

// Periodic cleanup to avoid unbounded growth.
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, bucket] of store.entries()) {
        if (bucket.resetAt <= now) store.delete(key);
      }
    },
    5 * 60 * 1000,
  ).unref?.();
}
