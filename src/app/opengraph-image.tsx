import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Andante practice tracking for audition season";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 76,
          background: "#050505",
          color: "#f5f5f5",
          fontFamily: "ui-serif, Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: "ui-sans-serif, system-ui" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#f5f5f5",
              color: "#050505",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ fontSize: 30, fontWeight: 500 }}>Andante</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 86, lineHeight: 0.96, letterSpacing: -4, maxWidth: 920 }}>
            Practice logs for the weeks before an audition.
          </div>
          <div style={{ marginTop: 28, fontSize: 28, color: "rgba(245,245,245,0.66)", fontFamily: "ui-sans-serif, system-ui" }}>
            Timers, repertoire, recordings, deadlines, and teacher updates in one place.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
