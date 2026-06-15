"use client";

// Renders the user's active repertoire by merging server pieces (real account)
// with the local demo library (pieces added during onboarding / via the Add
// button). This is what makes a just-added piece show up immediately.

import { useEffect, useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { AddPieceButton } from "@/components/pieces/add-piece-button";
import { PieceCards } from "@/components/pieces/piece-cards";
import type { PieceCardData } from "@/lib/app-data";
import { toCardData, useLibraryStore } from "@/lib/local-library";

export function PiecesView({ serverPieces }: { serverPieces: PieceCardData[] }) {
  const hydrate = useLibraryStore((s) => s.hydrate);
  const hydrated = useLibraryStore((s) => s.hydrated);
  const localPieces = useLibraryStore((s) => s.pieces);

  useEffect(() => { hydrate(); }, [hydrate]);

  const merged = useMemo(
    () => [...localPieces.map(toCardData), ...serverPieces],
    [localPieces, serverPieces],
  );

  // Avoid flashing the empty state before the local library hydrates.
  if (!hydrated && serverPieces.length === 0) {
    return <div style={{ minHeight: 120 }} />;
  }

  if (merged.length === 0) {
    return (
      <EmptyState
        title="Add your first piece"
        body="Track repertoire across the season. Each piece keeps its own goals, session log, and sheet music — which we'll find for you automatically."
        icon={<Icon name="plus" size={18} />}
        action={<AddPieceButton />}
      />
    );
  }

  return (
    <>
      <div className="t-micro" style={{ marginBottom: 12 }}>Active · {merged.length}</div>
      <PieceCards pieces={merged} />
    </>
  );
}
