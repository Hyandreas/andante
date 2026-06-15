// Best-effort in-memory sliding-window rate limiter.
//
// NOTE: This is per-instance and resets on cold start. Serverless deployments
// run many isolated instances, so this is NOT a hard guarantee. For production
// abuse protection use a distributed store (Upstash Redis / Vercel KV) keyed on
// the same client identifier. This in-memory limiter is a cheap first line of
// defense against trivial enumeration loops.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  b.count++;
  return { ok: true, retryAfter: 0 };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : "unknown";
}
