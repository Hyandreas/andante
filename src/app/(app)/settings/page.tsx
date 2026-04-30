import type { Metadata } from "next";
import { SettingsClient } from "@/components/settings/settings-client";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { UserRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  let profile: UserRow | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      profile = (data as UserRow | null) ?? null;
    }
  }

  return (
    <div style={{ flex: 1, padding: "32px 24px 48px", overflowY: "auto", maxWidth: 720, margin: "0 auto", width: "100%" }} className="lg:!px-10">
      <div className="t-section" style={{ fontSize: 24, marginBottom: 24 }}>Settings</div>
      <SettingsClient
        email={profile?.email ?? ""}
        displayName={profile?.display_name ?? ""}
        instrument={profile?.instrument ?? ""}
      />
    </div>
  );
}
