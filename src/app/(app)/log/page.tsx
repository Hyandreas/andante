import { Icon } from "@/components/ui/icon";
import { getLogPageData } from "@/lib/app-data";

export default async function LogPage() {
  const data = await getLogPageData();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="row-between" style={{ padding: "32px 24px 12px" }} >
        <div className="t-section" style={{ fontSize: 24 }}>Log</div>
        <button className="press" aria-label="Filter" style={{ width: 32, height: 32, display: "grid", placeItems: "center" }}>
          <Icon name="filter" size={22} />
        </button>
      </div>

      <div style={{ background: "var(--color-card-fill)", padding: "16px 24px", display: "flex", gap: 32 }}>
        <div>
          <div className="t-micro">This Week</div>
          <div className="t-card-label tabular" style={{ marginTop: 4, fontSize: 18 }}>{data.weekTotal}</div>
        </div>
        <div style={{ width: "0.5px", background: "var(--color-border)" }} />
        <div>
          <div className="t-micro">This Month</div>
          <div className="t-card-label tabular" style={{ marginTop: 4, fontSize: 18 }}>{data.monthTotal}</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "0 24px 48px", overflowY: "auto" }} className="lg:!px-10">
        {data.groups.map((g) => (
          <div key={g.date}>
            <div className="log-date-header t-caption muted">{g.date}</div>
            <div className="col">
              {g.items.map((s, i) => (
                <div key={i} style={{ padding: "14px 0", borderBottom: "0.5px solid var(--color-border)" }}>
                  <div className="row-between">
                    <div className="row" style={{ gap: 12 }}>
                      <div className="t-card-label" style={{ fontSize: 14 }}>{s.start}</div>
                      <div className="t-meta">{s.duration}</div>
                    </div>
                    <div className="t-caption muted" style={{ fontSize: 11 }}>{s.focus}</div>
                  </div>
                  <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {s.pieces.map((p, j) => (
                      <span key={j} style={{
                        background: "var(--color-card-fill)",
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 11,
                      }}>{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
