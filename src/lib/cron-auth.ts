import { timingSafeEqual } from "crypto";
import { serverEnv } from "@/lib/env-server";

// Cron authorization. Vercel Cron is configured to send
// `Authorization: Bearer <CRON_SECRET>`. We verify that header with a
// constant-time comparison and FAIL CLOSED if no secret is configured.
// We deliberately do NOT trust the spoofable `x-vercel-cron` header.
export function isCronAuthorized(req: Request): boolean {
  if (!serverEnv.cronSecret) return false; // fail closed
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${serverEnv.cronSecret}`;
  const a = Buffer.from(auth);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
