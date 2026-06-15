import type { Metadata } from "next";
import { SettingsClient } from "@/components/settings/settings-client";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import type { SubscriptionRow, UserPreferenceRow, UserRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  let profile: UserRow | null = null;
  let subscription: SubscriptionRow | null = null;
  let preferences: UserPreferenceRow | null = null;
  let authEmail = "";

  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      authEmail = user.email ?? "";
      const [{ data: userRow }, { data: subRow }, { data: prefRow }] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      profile = (userRow as UserRow | null) ?? null;
      subscription = (subRow as SubscriptionRow | null) ?? null;
      preferences = (prefRow as UserPreferenceRow | null) ?? null;

      if (profile && authEmail && profile.email !== authEmail) {
        profile = { ...profile, email: authEmail };
        await supabase.from("users").update({ email: authEmail }).eq("id", user.id);
      }
    }
  }

  return (
    <div style={{ flex: 1, padding: "32px 24px 88px", overflowY: "auto", maxWidth: 1040, margin: "0 auto", width: "100%" }} className="lg:!px-10">
      <SettingsClient
        email={authEmail || profile?.email || ""}
        displayName={profile?.display_name ?? ""}
        instrument={profile?.instrument ?? ""}
        regionFlag={profile?.region_flag ?? ""}
        dailyGoalMin={profile?.daily_goal_min ?? 90}
        timezone={profile?.timezone ?? "America/New_York"}
        role={profile?.role ?? "musician"}
        subscription={subscription}
        preferences={preferences}
        vapidPublicKey={env.vapidPublicKey ?? ""}
      />
    </div>
  );
}
