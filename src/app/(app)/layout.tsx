import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { DemoBanner } from "@/components/layout/demo-banner";
import { ToastProvider } from "@/components/ui/motion/toast";
import { FirstRunProvider } from "@/components/first-run/first-run-provider";
import { StudioGate } from "@/components/first-run/studio-gate";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

// Authenticated app shell. Sidebar on desktop, bottom nav on mobile.
// Middleware (proxy.ts) gates routes, but we re-verify the session here as
// defense-in-depth so rendering never proceeds for a missing/expired session
// even if the middleware matcher ever misses a path. Demo mode (no Supabase)
// renders the shell unguarded for local previews.
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return (
    <ToastProvider>
      <FirstRunProvider>
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)" }}>
          <DesktopSidebar />
          <main
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              paddingBottom: "calc(58px + env(safe-area-inset-bottom, 0))",
            }}
            className="lg:!pb-0"
          >
            <DemoBanner />
            <StudioGate>{children}</StudioGate>
          </main>
          <MobileNav />
        </div>
      </FirstRunProvider>
    </ToastProvider>
  );
}
