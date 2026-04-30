"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "home",     icon: "home",   label: "Home",     href: "/home" },
  { id: "pathways", icon: "target", label: "Pathways", href: "/pathways" },
  { id: "rooms",    icon: "users",  label: "Rooms",    href: "/rooms" },
  { id: "pieces",   icon: "music",  label: "Pieces",   href: "/pieces" },
  { id: "log",      icon: "list",   label: "Log",      href: "/log" },
] as const;

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
  const tabs = role === "teacher" ? TEACHER_TABS : TABS;

  return (
    <nav
      className={cn("nav-bar lg:hidden", hidden && "nav-hidden")}
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        height: "calc(58px + env(safe-area-inset-bottom, 0))",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        background: "var(--color-bg)",
        borderTop: "0.5px solid var(--color-border)",
        display: "flex",
        zIndex: 30,
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
            style={{
              flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 3,
              color: active ? "var(--color-text-primary)" : "var(--color-text-muted)",
              fontSize: 10, fontWeight: 400,
              transition: "color 150ms ease",
              textDecoration: "none",
            }}
          >
            <Icon name={t.icon as never} size={22} stroke={1.5} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
