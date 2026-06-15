import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SubscriptionRow } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Billing is not configured in this environment.", fallbackUrl: "/pricing" },
      { status: 503 },
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const subscription = data as SubscriptionRow | null;

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer is attached to this account.", fallbackUrl: "/pricing" },
      { status: 409 },
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${env.siteUrl}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
