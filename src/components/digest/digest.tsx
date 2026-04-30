interface DigestProps {
  sentLabel?: string;
  studentName?: string;
  studentSummary?: string;
  weekLabel?: string;
  hero?: [string, string, string][];
  week?: number[];
  teacherNote?: string;
  assignments?: [string, string][];
}

const DEFAULT_HERO: [string, string, string][] = [
  ["12h 24m", "practiced", "↑ 1h vs last week"],
  ["6 / 7", "days", "missed Sat"],
  ["3", "pieces worked", "Brahms, Sibelius, Bach"],
  ["2", "takes submitted", "scored 89, 81"],
];
const DEFAULT_ASSIGNMENTS: [string, string][] = [
  ["Brahms Sonata No. 3 · mvt. III", "loop mm. 41–58 at ♩ 84"],
  ["Sibelius Concerto · cadenza", "tempo ramp to ♩ 96"],
  ["Bach Sonata No. 1 · Adagio", "submit a fresh take by Friday"],
  ["Three-octave scales", "G major + g minor harmonic"],
];
const DEFAULT_WEEK = [124, 92, 88, 105, 142, 0, 78];

const microStyle = {
  fontSize: 11,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
  color: "#707070",
};

const metaStyle = {
  fontSize: 13,
  color: "rgba(15, 15, 15, 0.55)",
  lineHeight: 1.4,
};

export function Digest({
  sentLabel = "Sunday, Nov 16",
  studentName = "Mia Tanaka",
  studentSummary = "Violin · Studio of D. Romanowski",
  weekLabel = "Week of Nov 10–16",
  hero = DEFAULT_HERO,
  week = DEFAULT_WEEK,
  teacherNote = "Strong week. The Brahms is finally settling — the slow practice on mvt. III is paying off. For next week: bring the Sibelius cadenza up to ♩ 96 and submit a take on Friday. Saturday's miss is fine, just don't make it a habit before Curtis.",
  assignments = DEFAULT_ASSIGNMENTS,
}: DigestProps) {
  const weekMax = Math.max(...week, 1);

  return (
    <div style={{
      maxWidth: 720, margin: "0 auto",
      background: "#ffffff",
      border: "0.5px solid #e0e0e0",
      borderRadius: 14, overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
      color: "#0f0f0f",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    }}>
      <div style={{
        padding: "20px 28px",
        borderBottom: "0.5px solid #e0e0e0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 5,
            background: "#0f0f0f",
            display: "grid", placeItems: "center",
          }}>
            <div style={{
              width: 9, height: 9, border: "1.5px solid #ffffff",
              borderRadius: 999, borderTopColor: "transparent",
              transform: "rotate(-45deg)",
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Andante Studio · Weekly Digest</span>
        </div>
        <span style={microStyle}>{sentLabel}</span>
      </div>

      <div style={{ padding: "32px 36px 16px" }}>
        <div style={microStyle}>FOR THE PARENTS OF</div>
        <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.8, marginTop: 4 }}>{studentName}</div>
        <div style={{ ...metaStyle, marginTop: 4 }}>
          {studentSummary} · {weekLabel}
        </div>
      </div>

      <div style={{
        padding: "20px 36px",
        display: "grid", gap: 24,
        borderTop: "0.5px solid #e0e0e0",
        borderBottom: "0.5px solid #e0e0e0",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      }}>
        {hero.map(([number, label, sublabel], index) => (
          <div key={index}>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.5 }}>{number}</div>
            <div style={microStyle}>{label}</div>
            <div style={{ fontSize: 11, color: "#888888", marginTop: 4 }}>{sublabel}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "24px 36px" }}>
        <div style={{ ...microStyle, marginBottom: 12 }}>This Week</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 88 }}>
          {week.map((minutes, index) => (
            <div key={index} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%",
                  height: minutes === 0 ? "4%" : `${(minutes / weekMax) * 100}%`,
                  background: minutes === 0 ? "#e0e0e0" : "#0f0f0f",
                }} />
              </div>
              <div style={microStyle}>{["M", "T", "W", "T", "F", "S", "S"][index]}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 36px", borderTop: "0.5px solid #e0e0e0" }}>
        <div style={{ ...microStyle, marginBottom: 8 }}>Note from Teacher</div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "#0f0f0f" }}>
          “{teacherNote}”
        </div>
      </div>

      <div style={{ padding: "24px 36px", borderTop: "0.5px solid #e0e0e0" }}>
        <div style={{ ...microStyle, marginBottom: 12 }}>Assignments for next week</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {assignments.map(([key, value], index) => (
            <div key={index} style={{
              display: "grid", gap: 14,
              gridTemplateColumns: "auto 1fr auto",
              padding: "12px 0",
              borderBottom: index < assignments.length - 1 ? "0.5px solid #e0e0e0" : "none",
              alignItems: "center",
            }}>
              <div style={{ width: 16, height: 16, borderRadius: 999, border: "1.5px dashed #888888" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{key}</div>
                <div style={{ ...metaStyle, marginTop: 2 }}>{value}</div>
              </div>
              <span style={microStyle}>in app →</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: "20px 36px 28px",
        borderTop: "0.5px solid #e0e0e0",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div style={microStyle}>You are receiving this because your student is enrolled in Andante Studio.</div>
        <span style={{ ...metaStyle, fontSize: 12 }}>Open in app</span>
      </div>
    </div>
  );
}
