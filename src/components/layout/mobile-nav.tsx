"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { SCREEN_BY_ID } from "@/lib/first-run/config";
import { navItemState } from "@/lib/first-run/entitlement";
import { useFirstRunStore } from "@/lib/first-run/store";

// Bottom-bar eligible screens for the musician role, in order. The bar grows
// as free screens unlock; Pro teasers only appear once first-run is done.
const MOBILE_MUSICIAN_IDS = ["home", "pieces", "log", "goals", "pathways"];

const TEACHER_TABS = [
  { id: "home",     icon: "home",   label: "Home",     href: "/home" },
  { id: "students", icon: "users",  label: "Students", href: "/teacher" },
  { id: "log",      icon: "list",   label: "Log",      href: "/log" },
  { id: "goals",    icon: "target", label: "Goals",    href: "/goals" },
] as const;

interface MobileNavProps {
  hidden?: boolean;
  role?: "musician" | "teacher";
}

export function MobileNav({ hidden, role = "musician" }: MobileNavProps) {
  const pathname = usePathname();
  const data = useFirstRunStore((s) => s.data);

  let tabs: { id: string; icon: string; label: string; href: string; lockedPro?: boolean }[];

  if (role === "teacher") {
    tabs = TEACHER_TABS.map((t) => ({ ...t }));
  } else {
    tabs = MOBILE_MUSICIAN_IDS.map((id) => SCREEN_BY_ID[id])
      .filter(Boolean)
      .map((screen) => {
        const state = navItemState(data, screen);
        const lockedPro = state === "locked-pro";
        // Hidden free screens never show; Pro teasers only after first-run is done.
        if (state === "hidden") return null;
        if (lockedPro && data.stage !== "done") return null;
        return { id: screen.id, icon: screen.icon, label: screen.label, href: screen.href, lockedPro };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .slice(0, 5);
  }

  return (
    <nav
      className="flex lg:hidden"
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        height: "calc(58px + env(safe-area-inset-bottom, 0))",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        background: "var(--color-bg)",
        borderTop: "0.5px solid var(--color-border)",
        // display handled by the `flex lg:hidden` classes above — must NOT be
        // set inline, or the inline rule overrides `lg:hidden` and the bar
        // shows on desktop on top of the sidebar.
        zIndex: 30,
        // The hide behavior is driven by this inline transform (the old
        // `nav-bar`/`nav-hidden` classes were never defined in CSS).
        transform: hidden ? "translateY(110%)" : "translateY(0)",
        transition: "transform 240ms ease-in-out",
      }}
    >
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.id}
            href={t.href}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              minHeight: 44,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 3,
              position: "relative",
              color: active ? "var(--color-text-primary)" : "var(--color-text-muted)",
              opacity: t.lockedPro ? 0.7 : 1,
              fontSize: 11, fontWeight: 400,
              transition: "color 150ms ease",
              textDecoration: "none",
            }}
          >
            {/* Active indicator bar — keeps the active state from being
                color-only (a11y) and reads clearly against the hairline top border. */}
            <span
              aria-hidden="true"
              style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: 24, height: 2, borderRadius: 999,
                background: "var(--color-text-primary)",
                opacity: active ? 1 : 0,
                transition: "opacity 150ms ease",
              }}
            />
            <Icon name={t.icon as never} size={22} stroke={1.5} />
            <span>{t.label}</span>
            {t.lockedPro && (
              <span style={{ position: "absolute", top: 6, right: "22%", width: 5, height: 5, borderRadius: 999, background: "var(--color-text-muted)" }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
