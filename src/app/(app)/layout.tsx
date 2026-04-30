import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

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
// Auth gating happens in middleware; this layout assumes a valid session
// when Supabase is configured.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
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
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
