"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useTheme } from "@/lib/theme";
import { SCREENS } from "@/lib/first-run/config";
import { navItemState } from "@/lib/first-run/entitlement";
import { useFirstRunStore } from "@/lib/first-run/store";
import { demoFixturesEnabled } from "@/lib/env";

const PLAN_LABEL: Record<string, string> = { free: "FREE", trial: "TRIAL", pro: "PRO" };

export function DesktopSidebar() {
  const pathname = usePathname();
  const { resolvedTheme, toggle } = useTheme();
  const data = useFirstRunStore((s) => s.data);

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
          {PLAN_LABEL[data.plan] ?? "FREE"}
        </span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {SCREENS.map((screen) => {
          const state = navItemState(data, screen);
          if (state === "hidden") return null;
          const active = pathname === screen.href || pathname.startsWith(screen.href + "/");
          const lockedPro = state === "locked-pro";
          return (
            <Link
              key={screen.id}
              href={screen.href}
              className="press"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "9px 10px", borderRadius: 8,
                fontSize: 13.5, fontWeight: active ? 500 : 400,
                color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                background: active ? "var(--color-card-fill)" : "transparent",
                opacity: lockedPro ? 0.62 : 1,
                textDecoration: "none",
                transition: "color 120ms ease, background 120ms ease, opacity 120ms ease",
              }}
            >
              <Icon name={screen.icon} size={16} stroke={1.5} />
              <span style={{ flex: 1 }}>{screen.label}</span>
              {lockedPro && (
                <span style={{
                  fontSize: 9, letterSpacing: 0.8, fontWeight: 500,
                  padding: "2px 6px", borderRadius: 999,
                  border: "0.5px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                }}>PRO</span>
              )}
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
          <Icon name={resolvedTheme === "dark" ? "sun" : "moon"} size={16} stroke={1.5} />
          <span>{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
        {data.stage === "done" && demoFixturesEnabled() && (
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
        )}
      </div>
    </aside>
  );
}
