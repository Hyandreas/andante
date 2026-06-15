"use client";

// Local, demo-mode library of the user's pieces. In demo mode there's no
// Supabase to write to, so pieces the user adds (during onboarding or via the
// Add Piece button) live here in localStorage and are merged into the screens
// that show repertoire. When a piece is added we automatically look it up on
// IMSLP and attach the matching work page — no manual import needed.

import { create } from "zustand";
import type { PieceCardData } from "@/lib/app-data";

const KEY = "andante.library.v1";

export interface SheetRef {
  title: string;
  sourceUrl: string;
  sourceName: string;
}

export type SheetStatus = "idle" | "searching" | "found" | "none";

export interface LocalPiece {
  id: string;
  name: string;
  composer: string;
  role: string;
  progress: number; // 0..1
  createdAt: number;
  sheet: SheetRef | null;
  sheetStatus: SheetStatus;
}

export interface AddPieceInput {
  name: string;
  composer?: string;
  role?: string;
  progress?: number; // 0..1
}

function load(): LocalPiece[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalPiece[]) : [];
  } catch {
    return [];
  }
}

function persist(pieces: LocalPiece[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pieces));
  } catch {
    // ignore quota / privacy-mode failures
  }
}

/** Map a local piece to the shape the shared PieceCards/home cards expect. */
export function toCardData(p: LocalPiece): PieceCardData {
  return {
    id: p.id,
    name: p.name,
    composer: p.composer,
    role: p.role,
    progress: p.progress,
    weekTime: "New this week",
    lastPracticed: "Not practiced yet",
    totalSessions: 0,
    sheet: p.sheet,
    sheetStatus: p.sheetStatus,
  };
}

interface LibraryStore {
  hydrated: boolean;
  pieces: LocalPiece[];
  hydrate: () => void;
  addPiece: (input: AddPieceInput) => LocalPiece;
  updatePiece: (id: string, patch: Partial<LocalPiece>) => void;
  removePiece: (id: string) => void;
  hasPieceNamed: (name: string) => boolean;
  reset: () => void;
}

export const useLibraryStore = create<LibraryStore>((set, get) => {
  const write = (pieces: LocalPiece[]) => {
    persist(pieces);
    set({ pieces });
  };

  return {
    hydrated: false,
    pieces: [],

    hydrate: () => {
      if (get().hydrated) return;
      set({ pieces: load(), hydrated: true });
    },

    addPiece: (input) => {
      const piece: LocalPiece = {
        id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `p-${Date.now()}`,
        name: input.name.trim(),
        composer: (input.composer ?? "").trim(),
        role: (input.role ?? "").trim(),
        progress: input.progress ?? 0,
        createdAt: Date.now(),
        sheet: null,
        sheetStatus: "searching",
      };
      write([piece, ...get().pieces]);
      // Auto-find sheet music. Fire-and-forget; updates the piece when it lands.
      void findSheet(piece.id);
      return piece;
    },

    updatePiece: (id, patch) => {
      write(get().pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },

    removePiece: (id) => {
      write(get().pieces.filter((p) => p.id !== id));
    },

    hasPieceNamed: (name) => {
      const n = name.trim().toLowerCase();
      return get().pieces.some((p) => p.name.toLowerCase() === n);
    },

    reset: () => write([]),
  };
});

// Query our IMSLP proxy for the best matching work page and attach it.
async function findSheet(id: string) {
  const piece = useLibraryStore.getState().pieces.find((p) => p.id === id);
  if (!piece) return;
  const q = [piece.composer, piece.name].filter(Boolean).join(" ").trim() || piece.name;
  try {
    const res = await fetch(`/api/sheet-music/imslp/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) {
      useLibraryStore.getState().updatePiece(id, { sheetStatus: "none" });
      return;
    }
    const json = (await res.json()) as { results?: { title: string; sourceUrl: string; sourceName: string }[] };
    const top = json.results?.[0];
    useLibraryStore.getState().updatePiece(
      id,
      top
        ? { sheetStatus: "found", sheet: { title: top.title, sourceUrl: top.sourceUrl, sourceName: top.sourceName } }
        : { sheetStatus: "none" },
    );
  } catch {
    useLibraryStore.getState().updatePiece(id, { sheetStatus: "none" });
  }
}
