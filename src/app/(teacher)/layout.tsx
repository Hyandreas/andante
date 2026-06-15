import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Studio",
  robots: {
    index: false,
    follow: false,
  },
};

// Server-side authorization for the studio area. Being logged in is not enough —
// the studio is only for users whose `role` is "teacher". RLS is the last line
// of defense; this is the first. In demo mode (no Supabase) we render the
// preview unguarded so the studio can be explored locally.
export default async function TeacherLayout({ children }: { children: ReactNode }) {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/teacher");

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "teacher") redirect("/home");
  }

  return children;
}
