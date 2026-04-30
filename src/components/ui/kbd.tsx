import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span style={{
      display: "inline-grid", placeItems: "center",
      minWidth: 22, height: 22, padding: "0 6px",
      border: "0.5px solid var(--color-border)",
      borderRadius: 5,
      fontSize: 11, fontWeight: 500,
      color: "var(--color-text-secondary)",
      background: "var(--color-bg)",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    }}>
      {children}
    </span>
  );
}
