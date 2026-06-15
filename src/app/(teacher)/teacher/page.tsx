import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { StudioClient } from "@/components/teacher/studio-client";

export default function TeacherPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <DesktopSidebar />
      <main style={{ flex: 1, paddingBottom: "calc(58px + env(safe-area-inset-bottom, 0))" }} className="lg:!pb-0">
        <div style={{ padding: "32px 24px 48px", overflowY: "auto" }} className="lg:!px-10">
          <StudioClient />
        </div>
      </main>
      <MobileNav role="teacher" />
    </div>
  );
}
