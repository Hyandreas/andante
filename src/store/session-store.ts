"use client";

import { create } from "zustand";

export type FocusType = "Repertoire" | "Scales" | "Etudes" | "Sight-Reading";

interface SessionState {
  inSession: boolean;
  startTime: number | null;
  elapsed: number;
  paused: boolean;
  pieceId: string | null;
  pieceName: string | null;
  focusType: FocusType;
  notes: string;

  start: (opts?: { pieceId?: string; pieceName?: string }) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setElapsed: (s: number) => void;
  setFocusType: (f: FocusType) => void;
  setNotes: (n: string) => void;
  setPiece: (id: string, name: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  inSession: false,
  startTime: null,
  elapsed: 0,
  paused: false,
  pieceId: null,
  pieceName: null,
  focusType: "Repertoire",
  notes: "",

  start: (opts) => set({
    inSession: true,
    startTime: Date.now(),
    elapsed: 0,
    paused: false,
    pieceId: opts?.pieceId ?? null,
    pieceName: opts?.pieceName ?? null,
    notes: "",
  }),
  pause: () => set({ paused: true }),
  resume: () => set({ paused: false }),
  stop: () => set({ inSession: false, startTime: null, elapsed: 0, paused: false }),
  setElapsed: (s) => set({ elapsed: s }),
  setFocusType: (f) => set({ focusType: f }),
  setNotes: (n) => set({ notes: n }),
  setPiece: (id, name) => set({ pieceId: id, pieceName: name }),
}));
