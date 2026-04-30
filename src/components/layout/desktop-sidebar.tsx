"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useTheme } from "@/lib/theme";

const ITEMS = [
  { id: "home",        icon: "home",   label: "Today",          href: "/home" },
  { id: "pathways",    icon: "target", label: "Pathways",       href: "/pathways" },
  { id: "rooms",       icon: "users",  label: "Practice Rooms", href: "/rooms" },
  { id: "leaderboard", icon: "list",   label: "Leaderboard",    href: "/leaderboard" },
  { id: "pieces",      icon: "music",  label: "Pieces",         href: "/pieces" },
  { id: "loop",        icon: "timer",  label: "Loop Trainer",   href: "/loop" },
  { id: "recordings",  icon: "play",   label: "Recordings",     href: "/recordings" },
  { id: "log",         icon: "list",   label: "Log",            href: "/log" },
  { id: "goals",       icon: "target", label: "Goals",          href: "/goals" },
  { id: "pricing",     icon: "target", label: "Pricing",        href: "/pricing" },
  { id: "settings",    icon: "settings", label: "Settings",     href: "/settings" },
] as const;

export function DesktopSidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  return (
    <aside
      className="hidden lg:flex"
      style={{
        width: 224,
        borderRight: "0.5px solid var(--color-border)",
        padding: "28px 16px",
        flexDirection: "column",
        gap: 32,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
        <Image src="/logo-black.png" alt="Andante" width={22} height={22} style={{ borderRadius: 5 }} className="logo-light" />
        <Image src="/logo-white.png" alt="Andante" width={22} height={22} style={{ borderRadius: 5 }} className="logo-dark" />
        <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: -0.2 }}>Andante</span>
        <span style={{ marginLeft: "auto", fontSize: 10, letterSpacing: 1, color: "var(--color-text-muted)" }}>
          PRO
        </span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {ITEMS.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.id}
              href={it.href}
              className="press"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "9px 10px", borderRadius: 8,
                fontSize: 13.5, fontWeight: active ? 500 : 400,
                color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                background: active ? "var(--color-card-fill)" : "transparent",
                textDecoration: "none",
                transition: "color 120ms ease, background 120ms ease",
              }}
            >
              <Icon name={it.icon as never} size={16} stroke={1.5} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <button
          onClick={toggle}
          className="press"
          aria-label="Toggle dark mode"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 8,
            fontSize: 13, color: "var(--color-text-secondary)",
            background: "transparent", width: "100%",
            transition: "color 120ms ease",
          }}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={16} stroke={1.5} />
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
        <div style={{
          padding: 14,
          background: "var(--color-card-fill)",
          borderRadius: 10,
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div className="t-micro">This Week</div>
          <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.6, fontVariantNumeric: "tabular-nums" }}>
            11h 24m
          </div>
          <ProgressBar value={0.79} animateOnMount={false} />
          <div className="t-micro" style={{ marginTop: 2 }}>79% of 14h goal</div>
        </div>
      </div>
    </aside>
  );
}
