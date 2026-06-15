// Pure entitlement evaluation, shared by the edge middleware (proxy.ts) and
// server components (entitlement-server.ts) so the two enforcement points can
// never drift. NO imports — must stay safe to use from edge middleware.

export interface SubscriptionEntitlementRow {
  plan?: string | null;
  status?: string | null;
  period_end?: string | null;
}

/** True if the subscription row grants paid (Pro/Studio) access at `now`.
 *  Mirrors the SQL `has_paid_entitlement()` predicate in schema.sql. */
export function isPaidEntitlement(
  sub: SubscriptionEntitlementRow | null | undefined,
  now: number,
): boolean {
  if (!sub) return false;
  const periodEnd = sub.period_end ? Date.parse(sub.period_end) : Number.NaN;
  const periodActive = !Number.isFinite(periodEnd) || periodEnd > now;
  const statusActive = sub.status === "active" || sub.status === "trialing";
  const paidPlan = sub.plan === "pro" || sub.plan === "studio";
  return paidPlan && statusActive && periodActive;
}
