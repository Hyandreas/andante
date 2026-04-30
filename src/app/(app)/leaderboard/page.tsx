import { COHORTS, LEADERS } from "@/lib/sample-data";
import { initials } from "@/lib/utils";

function Spark({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 20, width: 56 }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1, height: `${(v / max) * 100}%`,
            background: i === data.length - 1 ? "var(--color-text-primary)" : "var(--color-bar-past)",
          }}
        />
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <div style={{ flex: 1, padding: "32px 24px 48px", overflowY: "auto" }} className="lg:!px-10">
      <div className="row-between" style={{ marginBottom: 6, alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="t-section" style={{ fontSize: 24 }}>Leaderboard</div>
          <div className="t-meta" style={{ marginTop: 4 }}>
            Hours practiced & streak among your cohort. Anonymized below #20.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["week", "month", "all-time"].map((s, i) => (
            <button key={s} className={`chip press ${i === 0 ? "active" : ""}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="chip-row no-scrollbar" style={{ margin: "20px 0 24px", overflowX: "auto", flexWrap: "nowrap", paddingBottom: 4 }}>
        {COHORTS.map((c, i) => (
          <button key={c.id} className={`chip press ${i === 0 ? "active" : ""}`}>{c.label}</button>
        ))}
      </div>

      <div style={{
        display: "grid", gap: 16,
        gridTemplateColumns: "repeat(2, minmax(0,1fr))",
        padding: "16px 0", marginBottom: 24,
        borderTop: "0.5px solid var(--color-border)",
        borderBottom: "0.5px solid var(--color-border)",
      }} className="lg:!grid-cols-4">
        {[
          ["Your rank", "#142", "↑ 6 this week"],
          ["Cohort percentile", "top 11%", "of 1,284"],
          ["Hours behind #1", "8.0h", "this week"],
          ["Pace to overtake #141", "Thursday", "at current rate"],
        ].map(([l, n, sub]) => (
          <div key={l}>
            <div className="t-micro">{l}</div>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>{n}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Top-3 podium */}
      <div style={{
        display: "grid",
        gap: 12, marginBottom: 28, alignItems: "end",
        gridTemplateColumns: "1fr 1.2fr 1fr",
      }}>
        {[LEADERS[1], LEADERS[0], LEADERS[2]].map((p, i) => {
          const isCenter = i === 1;
          return (
            <div
              key={p.rank}
              className="card reveal-up"
              style={{
                padding: 20, paddingBottom: isCenter ? 28 : 20,
                display: "flex", flexDirection: "column", gap: 10,
                transform: `scale(${isCenter ? 1.02 : 1})`,
                background: isCenter ? "var(--color-text-primary)" : "var(--color-card-fill)",
                color: isCenter ? "var(--color-bg)" : "var(--color-text-primary)",
                minHeight: 220,
                animationDelay: `${i * 90}ms`,
              }}
            >
              <div className="row-between">
                <span style={{ fontSize: 10, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>#{p.rank}</span>
                <span style={{ fontSize: 14 }}>{p.region}</span>
              </div>
              <div style={{ marginTop: "auto" }}>
                <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: -0.2 }}>{p.name}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{p.instrument}</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 32, fontWeight: 500, letterSpacing: -0.8, fontVariantNumeric: "tabular-nums" }}>
                  {p.weekHours}
                </span>
                <span style={{ fontSize: 12, opacity: 0.6 }}>hrs</span>
              </div>
              <div className="row-between" style={{ fontSize: 11, opacity: 0.7 }}>
                <span>{p.streak}d streak</span>
                <span>♥ {p.kudos}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranked table */}
      <div className="hidden md:!grid" style={{
        gridTemplateColumns: "60px 1fr 100px 1fr 80px 100px 90px",
        padding: "10px 0", borderBottom: "0.5px solid var(--color-border)",
      }}>
        {["Rank", "Musician", "Region", "", "Streak", "Hours", ""].map((h, i) => (
          <div key={i} className="t-micro">{h}</div>
        ))}
      </div>
      {LEADERS.map((p) => (
        <div
          key={p.rank}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) auto",
            padding: "14px 0", borderBottom: "0.5px solid var(--color-border)",
            alignItems: "center",
            background: p.you ? "var(--color-card-fill)" : "transparent",
            marginLeft: p.you ? -16 : 0, marginRight: p.you ? -16 : 0,
            paddingLeft: p.you ? 16 : 0, paddingRight: p.you ? 16 : 0,
          }}
          className="md:!grid-cols-[60px_1fr_100px_1fr_80px_100px_90px]"
        >
          <div className="md:!hidden" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: p.you ? 500 : 400, fontVariantNumeric: "tabular-nums", color: "var(--color-text-secondary)" }}>
              #{p.rank}
            </span>
            <div style={{
              width: 28, height: 28, borderRadius: 999,
              background: p.you ? "var(--color-text-primary)" : "var(--color-card-fill)",
              color: p.you ? "var(--color-bg)" : "var(--color-text-primary)",
              display: "grid", placeItems: "center",
              fontSize: 11, fontWeight: 500,
              border: "0.5px solid var(--color-border)",
              flexShrink: 0,
            }}>{initials(p.name)}</div>
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 14, fontWeight: p.you ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
              <div className="t-meta">{p.instrument} · {p.streak}d</div>
            </div>
          </div>

          <div className="hidden md:!block" style={{ fontSize: 15, fontWeight: p.you ? 500 : 400, fontVariantNumeric: "tabular-nums" }}>
            #{p.rank}
          </div>
          <div className="hidden md:!flex" style={{ alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 999,
              background: p.you ? "var(--color-text-primary)" : "var(--color-card-fill)",
              color: p.you ? "var(--color-bg)" : "var(--color-text-primary)",
              display: "grid", placeItems: "center",
              fontSize: 11, fontWeight: 500,
              border: "0.5px solid var(--color-border)",
            }}>{initials(p.name)}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: p.you ? 500 : 400 }}>{p.name}</div>
              <div className="t-meta">{p.instrument}</div>
            </div>
          </div>
          <div className="hidden md:!block" style={{ fontSize: 14 }}>{p.region}</div>
          <div className="hidden md:!block"><Spark data={p.trend} /></div>
          <div className="hidden md:!block" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{p.streak}d</div>
          <div className="hidden md:!block" style={{ fontSize: 16, fontWeight: 500, fontVariantNumeric: "tabular-nums", letterSpacing: -0.3 }}>
            {p.weekHours}h
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
            <span className="md:!hidden tabular" style={{ fontSize: 14, fontWeight: 500 }}>{p.weekHours}h</span>
            {p.you ? (
              <span className="t-micro">YOU</span>
            ) : (
              <button className="press" style={{
                fontSize: 12, padding: "5px 10px",
                border: "0.5px solid var(--color-border)", borderRadius: 6,
                color: "var(--color-text-secondary)",
              }}>♥ {p.kudos}</button>
            )}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: 24, padding: "16px 20px",
        background: "var(--color-text-primary)", color: "var(--color-bg)",
        borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>2.4h to overtake #141 (Sasha B.)</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
            At your current pace, you'd pass them by Thursday.
          </div>
        </div>
        <button className="press" style={{
          background: "var(--color-bg)", color: "var(--color-text-primary)",
          padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
        }}>Plan today's session</button>
      </div>
    </div>
  );
}
