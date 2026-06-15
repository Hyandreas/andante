// Server wrapper: re-verifies Pro entitlement on the server (defense-in-depth
// for C9) before rendering the client view. No-op in demo mode.
//
// NOTE: Loop Trainer is the "gifted" free feature, but the gift is only tracked
// client-side (first-run store). The middleware already lists /loop in PRO_ONLY,
// so in live mode a non-subscribed user is gated here too — matching existing
// behavior. Honoring the gift server-side needs a persisted gift record; see
// the launch notes.
import { requireProEntitlement } from "@/lib/entitlement-server";
import { LoopView } from "./loop-view";

export default async function LoopPage() {
  await requireProEntitlement();
  return <LoopView />;
}
