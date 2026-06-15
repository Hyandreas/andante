import { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  body?: string;
  /** Primary CTA: rendered as a button or link by passing your own element. */
  action?: ReactNode;
  /** Optional decorative content above the title (e.g. an icon or mini chart). */
  icon?: ReactNode;
  /** Optional secondary subtle line below the body. */
  hint?: string;
  /** Center content vertically inside the available space. */
  fill?: boolean;
}

/**
 * Empty-state block. Built to live inside a card or fill a route pane.
 * Restrained: no large illustrations, just a tight stack with a clear
 * next-step CTA.
 */
export function EmptyState({ title, body, action, icon, hint, fill }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "48px 24px",
        gap: 14,
        minHeight: fill ? "60vh" : undefined,
        justifyContent: fill ? "center" : "flex-start",
      }}
    >
      {icon && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            border: "0.5px solid var(--color-border)",
            display: "grid",
            placeItems: "center",
            color: "var(--color-text-secondary)",
            marginBottom: 6,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.15, maxWidth: 360 }}>
        {title}
      </div>
      {body && (
        <div
          className="t-meta"
          style={{ maxWidth: 360, lineHeight: 1.5 }}
        >
          {body}
        </div>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
      {hint && (
        <div className="t-micro" style={{ marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
