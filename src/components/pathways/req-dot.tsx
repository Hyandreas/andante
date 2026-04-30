interface ReqDotProps {
  status: "todo" | "active" | "done";
}

export function ReqDot({ status }: ReqDotProps) {
  if (status === "done") {
    return (
      <div style={{
        width: 18, height: 18, borderRadius: 999,
        background: "var(--color-text-primary)",
        display: "grid", placeItems: "center",
      }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--color-bg)" strokeWidth={3.5}>
          <polyline points="5 12 10 17 19 7" />
        </svg>
      </div>
    );
  }
  if (status === "active") {
    return (
      <div style={{
        width: 18, height: 18, borderRadius: 999,
        border: "1.5px solid var(--color-text-primary)",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 4, borderRadius: 999,
          background: "var(--color-text-primary)",
          animation: "breathe 2.4s ease-in-out infinite",
        }} />
      </div>
    );
  }
  return (
    <div style={{
      width: 18, height: 18, borderRadius: 999,
      border: "1.5px dashed var(--color-text-muted)",
    }} />
  );
}
