import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Payments not configured in this environment." }, { status: 503 });
  }

  const { planId, cadence } = await req.json() as { planId: "pro" | "studio"; cadence: "monthly" | "yearly" };

  const priceKey =
    planId === "pro" && cadence === "yearly" ? "STRIPE_PRICE_PRO_YEARLY" :
    planId === "pro"                          ? "STRIPE_PRICE_PRO_MONTHLY" :
    planId === "studio"                       ? "STRIPE_PRICE_STUDIO_MONTHLY" : null;
  const priceId =
    planId === "pro" && cadence === "yearly" ? env.stripePrices.proYearly :
    planId === "pro"                          ? env.stripePrices.proMonthly :
    planId === "studio"                       ? env.stripePrices.studioMonthly : null;
  if (!priceId) {
    return NextResponse.json(
      { error: priceKey ? `Missing ${priceKey} in your environment.` : "Unknown plan." },
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

  return NextResponse.json({ url: session.url });
}
