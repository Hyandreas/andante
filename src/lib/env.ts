// Client-SAFE env access. This module contains ONLY public values that are
// safe to ship in the browser bundle (NEXT_PUBLIC_* and derived helpers).
// Server-only secrets (service-role key, Stripe secret, Resend, VAPID private,
// CRON secret, etc.) live in `src/lib/env-server.ts` and must NEVER be imported
// from a "use client" component. Reads use sensible dev fallbacks so the UI can
// be developed offline without a live Supabase / Stripe project.

const PUBLIC_FALLBACK_URL = "https://placeholder.supabase.co";
const PUBLIC_FALLBACK_KEY = "placeholder-anon-key";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? PUBLIC_FALLBACK_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? PUBLIC_FALLBACK_KEY,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
} as const;

// Load-bearing seam between demo mode and live Supabase. Called in 25+ places —
// every client-side write path guards on this before touching the DB.
// If demo mode ever breaks after provisioning a real project, audit callers of this function.
export const isSupabaseConfigured = () =>
  env.supabaseUrl !== PUBLIC_FALLBACK_URL &&
  env.supabaseAnonKey !== PUBLIC_FALLBACK_KEY;

export const demoModeAllowed = () =>
  process.env.NEXT_PUBLIC_ALLOW_DEMO_MODE === "1" ||
  process.env.NEXT_PUBLIC_ALLOW_DEMO_MODE === "true";

export const productionRequiresSupabase = () =>
  process.env.NODE_ENV === "production" &&
  !demoModeAllowed() &&
  !isSupabaseConfigured();

// When OFF (the default), empty/demo states render genuinely empty so a new
// user "builds the app from nothing" through the first-run tutorial. The rich
// placeholder data (Brahms, streaks, cohort feed, etc.) is preserved in
// `src/lib/sample-data.ts` and re-enabled by setting NEXT_PUBLIC_DEMO_FIXTURES=1
// (e.g. in .env.local) for development reference. NEXT_PUBLIC_ so it's readable
// on both server (data layer) and client (sidebar).
export const demoFixturesEnabled = () =>
  process.env.NEXT_PUBLIC_DEMO_FIXTURES === "1" ||
  process.env.NEXT_PUBLIC_DEMO_FIXTURES === "true";
