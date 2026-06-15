// Server wrapper: re-verifies Pro entitlement on the server (defense-in-depth
// for C9) before rendering the client view. No-op in demo mode.
import { requireProEntitlement } from "@/lib/entitlement-server";
import { RecordingsView } from "./recordings-view";

export default async function RecordingsPage() {
  await requireProEntitlement();
  return <RecordingsView />;
}
