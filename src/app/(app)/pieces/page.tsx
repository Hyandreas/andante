import { AddPieceButton } from "@/components/pieces/add-piece-button";
import { PiecesView } from "@/components/pieces/pieces-view";
import { getPiecesData } from "@/lib/app-data";
import { demoFixturesEnabled } from "@/lib/env";

const ARCHIVED = [
  { name: "Bach Partita No. 2 in D minor", composer: "J.S. Bach", progress: 0.92 },
  { name: "Mozart Concerto No. 5 in A",    composer: "W.A. Mozart", progress: 1.0 },
  { name: "Kreisler Praeludium",            composer: "F. Kreisler", progress: 0.88 },
];

export default async function PiecesPage() {
  const pieces = await getPiecesData();
  const showArchived = demoFixturesEnabled();

  return (
    <div style={{ flex: 1, padding: "32px 24px 48px", overflowY: "auto" }} className="lg:!px-10">
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div className="t-section" style={{ fontSize: 24 }}>Pieces</div>
        <AddPieceButton />
      </div>

      <PiecesView serverPieces={pieces} />

      {showArchived && (
        <>
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
        </>
      )}
    </div>
  );
}
