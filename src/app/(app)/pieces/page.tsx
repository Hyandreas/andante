import { ProgressBar } from "@/components/ui/progress-bar";
import { AddPieceButton } from "@/components/pieces/add-piece-button";
import { getPiecesData } from "@/lib/app-data";

const ARCHIVED = [
  { name: "Bach Partita No. 2 in D minor", composer: "J.S. Bach", progress: 0.92 },
  { name: "Mozart Concerto No. 5 in A",    composer: "W.A. Mozart", progress: 1.0 },
  { name: "Kreisler Praeludium",            composer: "F. Kreisler", progress: 0.88 },
];

export default async function PiecesPage() {
  const pieces = await getPiecesData();

  return (
    <div style={{ flex: 1, padding: "32px 24px 48px", overflowY: "auto" }} className="lg:!px-10">
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div className="t-section" style={{ fontSize: 24 }}>Pieces</div>
        <AddPieceButton />
      </div>

      <div className="t-micro" style={{ marginBottom: 12 }}>Active · {pieces.length}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pieces.map((p, i) => (
          <div
            key={p.id}
            id={p.id}
            className="card reveal-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="row-between" style={{ alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div className="t-card-label">{p.name}</div>
                <div className="t-meta" style={{ marginTop: 4 }}>{p.composer}{p.role ? ` · ${p.role}` : ""}</div>
              </div>
              <div className="col" style={{ alignItems: "flex-end", gap: 4 }}>
                <div className="t-card-label tabular">{Math.round(p.progress * 100)}%</div>
                <div className="t-meta" style={{ fontSize: 11 }}>{p.weekTime}</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <ProgressBar value={p.progress} delay={i * 40} />
            </div>
            <div className="row-between" style={{ marginTop: 12 }}>
              <div className="t-micro">{p.lastPracticed}</div>
              <div className="t-micro">{p.totalSessions} sessions</div>
            </div>
          </div>
        ))}
      </div>

      <div className="t-micro" style={{ marginTop: 32, paddingBottom: 12 }}>Archived · {ARCHIVED.length}</div>
      <div className="col" style={{ gap: 0, opacity: 0.55 }}>
        {ARCHIVED.map((p, i) => (
          <div key={i} className="row-between" style={{ padding: "12px 0", borderBottom: "0.5px solid var(--color-border)" }}>
            <div>
              <div className="t-body" style={{ fontWeight: 500 }}>{p.name}</div>
              <div className="t-meta" style={{ marginTop: 4 }}>{p.composer}</div>
            </div>
            <div className="t-meta">{Math.round(p.progress * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
