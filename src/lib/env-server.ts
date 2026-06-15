// SERVER-ONLY env access. These are SECRETS and must never reach the browser
// bundle. This module is only imported by Route Handlers and server-only libs
// (Stripe, Resend, web-push, the Supabase service-role/admin client, cron jobs).
//
// We don't have the `server-only` package installed, so we enforce the boundary
// with a runtime guard: importing this from client code throws immediately
// instead of silently shipping secret-shaped references to the browser.
import { env as publicEnv, productionRequiresSupabase } from "@/lib/env";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/env-server.ts was imported in the browser. Server secrets must " +
      "only be read from server code (Route Handlers / server components / server libs).",
  );
}

// Fail-closed in production (audit M7). If we're a real production runtime with
// no Supabase configured AND demo mode wasn't explicitly opted into
// (NEXT_PUBLIC_ALLOW_DEMO_MODE=1), refuse to run rather than silently serving
// the app wide-open in demo fail-open mode. Skipped during `next build` so a
// production build never trips on env that's only present at runtime, and a
// no-op in development (the local investor demo).
if (
  process.env.NEXT_PHASE !== "phase-production-build" &&
  productionRequiresSupabase()
) {
  throw new Error(
    "Refusing to start: NODE_ENV=production but Supabase is not configured and " +
      "demo mode is not allowed. Set the Supabase env vars, or set " +
      "NEXT_PUBLIC_ALLOW_DEMO_MODE=1 to run the demo in production intentionally.",
  );
}

export const serverEnv = {
  // Re-export the public Supabase URL so server callers have one import site.
  supabaseUrl: publicEnv.supabaseUrl,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePrices: {
    proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    proYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    studioMonthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY,
  },
  resendApiKey: process.env.RESEND_API_KEY,
  digestFromEmail: process.env.DIGEST_FROM_EMAIL,
  cronSecret: process.env.CRON_SECRET,
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject:
    process.env.VAPID_SUBJECT ?? process.env.DIGEST_FROM_EMAIL ?? "mailto:hello@andante.app",
  composerWorkerUrl: process.env.COMPOSER_WORKER_URL,
  composerWorkerSecret: process.env.COMPOSER_WORKER_SECRET,
} as const;
