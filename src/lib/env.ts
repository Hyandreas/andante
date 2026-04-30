// Centralized env access. Reads use sensible dev fallbacks so the UI can
// be developed offline without a live Supabase / Stripe project; production
// code paths that require these (DB writes, payments) will throw clearly.

const PUBLIC_FALLBACK_URL = "https://placeholder.supabase.co";
const PUBLIC_FALLBACK_KEY = "placeholder-anon-key";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? PUBLIC_FALLBACK_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? PUBLIC_FALLBACK_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
  stripePrices: {
    proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    proYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    studioMonthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY,
  },
  resendApiKey: process.env.RESEND_API_KEY,
  digestFromEmail: process.env.DIGEST_FROM_EMAIL,
  cronSecret: process.env.CRON_SECRET,
} as const;

export const isSupabaseConfigured = () =>
  env.supabaseUrl !== PUBLIC_FALLBACK_URL &&
  env.supabaseAnonKey !== PUBLIC_FALLBACK_KEY;
