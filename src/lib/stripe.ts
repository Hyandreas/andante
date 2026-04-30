import Stripe from "stripe";
import { env } from "@/lib/env";

let _client: Stripe | null = null;

// Returns a Stripe client, or null when the secret key isn't configured
// (e.g. in design-only previews). API routes guard on `null` and return 503.
export function getStripe(): Stripe | null {
  if (!env.stripeSecretKey) return null;
  if (_client) return _client;
  _client = new Stripe(env.stripeSecretKey);
  return _client;
}
