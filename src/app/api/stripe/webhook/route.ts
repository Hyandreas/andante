import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env-server";
import { getStripe } from "@/lib/stripe";

// Stripe → Supabase plan sync. Runs on the Node runtime so we can read the
// raw request body for signature verification.
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTITLEMENT_STATUSES = new Set(["active", "trialing"]);

function trustedUserId(metadata: Stripe.Metadata | null | undefined) {
  const userId = metadata?.user_id;
  return userId && UUID_RE.test(userId) ? userId : null;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  return (subscription as unknown as { current_period_end?: number }).current_period_end;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe || !serverEnv.stripeWebhookSecret || !serverEnv.supabaseServiceRoleKey) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, serverEnv.stripeWebhookSecret);
  } catch {
    // Don't echo the library's signature error back to the caller.
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Ignore events from the wrong mode (e.g. a test-mode event hitting a live
  // deployment) so they can't mutate production subscription state.
  const expectLive = serverEnv.stripeSecretKey?.startsWith("sk_live") ?? false;
  if (event.livemode !== expectLive) {
    return NextResponse.json({ received: true, ignored: "livemode mismatch" });
  }

  // Service-role client — bypasses RLS, used only here in trusted server code.
  const admin = createClient(env.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const md = session.metadata ?? {};
      // Only trust a well-formed UUID that we set ourselves at checkout. A missing
      // or malformed user_id is acknowledged without writing anything.
      const userId = trustedUserId(md);
      if (!userId) break;
      const plan = (md.plan === "studio" ? "studio" : "pro") as "pro" | "studio";
      const cadence = (md.cadence === "yearly" ? "yearly" : "monthly") as "monthly" | "yearly";
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
      const customerId =
        (subscription && typeof subscription.customer === "string" ? subscription.customer : null) ??
        (typeof session.customer === "string" ? session.customer : null);
      const status = subscription?.status ?? "incomplete";
      const periodEnd = subscription ? subscriptionPeriodEnd(subscription) : null;

      const { error } = await admin.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan: ENTITLEMENT_STATUSES.has(status) ? plan : "free",
        cadence,
        status,
        period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) {
        console.error("[stripe/webhook] checkout subscription upsert failed:", error);
        return NextResponse.json({ error: "Sync failed." }, { status: 500 });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const md = sub.metadata ?? {};
      const userId = trustedUserId(md);
      if (!userId) break;
      const plan = (md.plan === "studio" ? "studio" : "pro") as "pro" | "studio";
      const cadence = (md.cadence === "yearly" ? "yearly" : "monthly") as "monthly" | "yearly";
      const periodEnd = subscriptionPeriodEnd(sub);
      const customerId = typeof sub.customer === "string" ? sub.customer : null;
      const { error } = await admin.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        plan: ENTITLEMENT_STATUSES.has(sub.status) ? plan : "free",
        cadence,
        status: sub.status,
        period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) {
        console.error("[stripe/webhook] subscription upsert failed:", error);
        return NextResponse.json({ error: "Sync failed." }, { status: 500 });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = trustedUserId(sub.metadata);
      if (!userId) break;
      const { error } = await admin.from("subscriptions").upsert({
        user_id: userId,
        stripe_subscription_id: sub.id,
        plan: "free",
        status: sub.status || "canceled",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) {
        console.error("[stripe/webhook] subscription cancel upsert failed:", error);
        return NextResponse.json({ error: "Sync failed." }, { status: 500 });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
