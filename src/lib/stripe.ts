import Stripe from "stripe";
import { serverEnv } from "@/lib/env-server";

let _client: Stripe | null = null;

// Returns a Stripe client, or null when the secret key isn't configured
// (e.g. in design-only previews). API routes guard on `null` and return 503.
export function getStripe(): Stripe | null {
  if (!serverEnv.stripeSecretKey) return null;
  if (_client) return _client;
  _client = new Stripe(serverEnv.stripeSecretKey);
  return _client;
}
