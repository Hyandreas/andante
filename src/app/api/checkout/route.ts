import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env-server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const PLAN_IDS = new Set(["pro", "studio"]);
const CADENCES = new Set(["monthly", "yearly"]);

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Payments not configured in this environment." }, { status: 503 });
  }

  let body: { planId?: unknown; cadence?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const planId = String(body.planId ?? "");
  const cadence = String(body.cadence ?? "");
  if (!PLAN_IDS.has(planId) || !CADENCES.has(cadence)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const priceKey =
    planId === "pro" && cadence === "yearly" ? "STRIPE_PRICE_PRO_YEARLY" :
    planId === "pro"                          ? "STRIPE_PRICE_PRO_MONTHLY" :
    "STRIPE_PRICE_STUDIO_MONTHLY";
  const priceId =
    planId === "pro" && cadence === "yearly" ? serverEnv.stripePrices.proYearly :
    planId === "pro"                          ? serverEnv.stripePrices.proMonthly :
    serverEnv.stripePrices.studioMonthly;
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing ${priceKey} in your environment.` },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.siteUrl}/home?checkout=success`,
    cancel_url: `${env.siteUrl}/pricing?checkout=cancel`,
    metadata: { user_id: user.id, plan: planId, cadence },
    subscription_data: { metadata: { user_id: user.id, plan: planId, cadence } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
}
