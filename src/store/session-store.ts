"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type FocusType = "Repertoire" | "Scales" | "Etudes" | "Sight-Reading";
export type SessionMode = "practice" | "composer";

interface SessionState {
  inSession: boolean;
  startTime: number | null;
  pausedAt: number | null;
  pausedTotal: number;
  elapsed: number;
  paused: boolean;
  pieceId: string | null;
  pieceName: string | null;
  sheetMusicId: string | null;
  sheetMusicTitle: string | null;
  sessionMode: SessionMode;
  entryPathwayId: string | null;
  entryRequirementId: string | null;
  focusType: FocusType;
  notes: string;
  // True after a refresh restored an in-progress session whose live recorder
  // (MediaRecorder/stream) couldn't be persisted. Set on rehydrate; the session
  // page uses it to degrade a composer session gracefully and surface a notice.
  recorderLost: boolean;

  start: (opts?: {
    pieceId?: string | null;
    pieceName?: string | null;
    sheetMusicId?: string | null;
    sheetMusicTitle?: string | null;
    sessionMode?: SessionMode;
    entryPathwayId?: string | null;
    entryRequirementId?: string | null;
  }) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setElapsed: (s: number) => void;
  setFocusType: (f: FocusType) => void;
  setNotes: (n: string) => void;
  setPiece: (id: string | null, name: string | null) => void;
  setSheetMusic: (id: string | null, title: string | null) => void;
  acknowledgeRecorderLost: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
  inSession: false,
  startTime: null,
  pausedAt: null,
  pausedTotal: 0,
  elapsed: 0,
  paused: false,
  pieceId: null,
  pieceName: null,
  sheetMusicId: null,
  sheetMusicTitle: null,
  sessionMode: "practice",
  entryPathwayId: null,
  entryRequirementId: null,
  focusType: "Repertoire",
  notes: "",
  recorderLost: false,

  start: (opts) => set({
    inSession: true,
    startTime: Date.now(),
    pausedAt: null,
    pausedTotal: 0,
    elapsed: 0,
    paused: false,
    pieceId: opts?.pieceId ?? null,
    pieceName: opts?.pieceName ?? null,
    sheetMusicId: opts?.sheetMusicId ?? null,
    sheetMusicTitle: opts?.sheetMusicTitle ?? null,
    sessionMode: opts?.sessionMode ?? "practice",
    entryPathwayId: opts?.entryPathwayId ?? null,
    entryRequirementId: opts?.entryRequirementId ?? null,
    notes: "",
    recorderLost: false,
  }),
  pause: () => {
    if (get().paused) return;
    set({ paused: true, pausedAt: Date.now() });
  },
  resume: () => {
    const { pausedAt, pausedTotal } = get();
    if (pausedAt == null) {
      set({ paused: false });
      return;
    }
    set({ paused: false, pausedAt: null, pausedTotal: pausedTotal + (Date.now() - pausedAt) });
  },
  stop: () => set({
    inSession: false, startTime: null, pausedAt: null, pausedTotal: 0,
    elapsed: 0, paused: false, sheetMusicId: null, sheetMusicTitle: null,
    sessionMode: "practice", entryPathwayId: null, entryRequirementId: null,
    recorderLost: false,
  }),
  setElapsed: (s) => set({ elapsed: s }),
  setFocusType: (f) => set({ focusType: f }),
  setNotes: (n) => set({ notes: n }),
  setPiece: (id, name) => set({ pieceId: id, pieceName: name }),
  setSheetMusic: (id, title) => set({ sheetMusicId: id, sheetMusicTitle: title }),
  acknowledgeRecorderLost: () => set({ recorderLost: false }),
    }),
    {
      name: "andante.session.v1",
      storage: createJSONStorage(() => localStorage),
      // Only serializable timer state is persisted. The live MediaRecorder /
      // MediaStream (composer mode) cannot be persisted, so on rehydrate of an
      // in-progress composer session we mark recorderLost and downgrade it to a
      // normal practice session — the timer keeps running, but no source audio
      // is captured for the part played before the refresh.
      partialize: (state) => ({
        inSession: state.inSession,
        startTime: state.startTime,
        pausedAt: state.pausedAt,
        pausedTotal: state.pausedTotal,
        paused: state.paused,
        pieceId: state.pieceId,
        pieceName: state.pieceName,
        sheetMusicId: state.sheetMusicId,
        sheetMusicTitle: state.sheetMusicTitle,
        sessionMode: state.sessionMode,
        entryPathwayId: state.entryPathwayId,
        entryRequirementId: state.entryRequirementId,
        focusType: state.focusType,
        notes: state.notes,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.inSession && state.sessionMode === "composer") {
          // The recorder didn't survive the reload — degrade gracefully.
          state.recorderLost = true;
          state.sessionMode = "practice";
        }
        // Recompute elapsed from wall-clock so the timer view is correct on load.
        if (state.inSession && state.startTime != null) {
          const ref = state.paused && state.pausedAt != null ? state.pausedAt : Date.now();
          state.elapsed = Math.max(0, Math.floor((ref - state.startTime - state.pausedTotal) / 1000));
        }
      },
    },
  ),
);
