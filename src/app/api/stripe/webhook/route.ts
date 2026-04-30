import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

// Stripe → Supabase plan sync. Runs on the Node runtime so we can read the
// raw request body for signature verification.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe || !env.stripeWebhookSecret || !env.supabaseServiceRoleKey) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.stripeWebhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Bad signature: ${(err as Error).message}` }, { status: 400 });
  }

  // Service-role client — bypasses RLS, used only here in trusted server code.
  const admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const obj = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
  const md = (obj.metadata ?? {}) as Record<string, string>;

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const userId = md.user_id;
      if (!userId) break;
      const plan = (md.plan ?? "pro") as "pro" | "studio";
      const cadence = (md.cadence ?? "monthly") as "monthly" | "yearly";
      const sub = obj as Stripe.Subscription;
      // Cast through unknown for the optional period field; Stripe types
      // distinguish session vs subscription objects but we accept both here.
      const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
      const customerId = typeof obj.customer === "string" ? obj.customer : null;
      await admin.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: typeof (obj as Stripe.Checkout.Session).subscription === "string"
          ? (obj as Stripe.Checkout.Session).subscription as string
          : obj.id,
        plan,
        cadence,
        status: "active",
        period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      break;
    }
    case "customer.subscription.deleted": {
      const userId = md.user_id;
      if (!userId) break;
      await admin.from("subscriptions").upsert({
        user_id: userId,
        plan: "free",
        status: "canceled",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
