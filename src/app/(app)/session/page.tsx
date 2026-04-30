"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { TimerDisplay } from "@/components/ui/timer-display";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useSessionStore } from "@/store/session-store";
import { drain, enqueue } from "@/lib/offline-sessions";
import { PIECES } from "@/lib/sample-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDuration } from "@/lib/utils";
import type { FocusType, PieceRow } from "@/lib/supabase/types";

const VALID_FOCUS: ReadonlyArray<FocusType> = ["repertoire", "scales", "etudes", "sight-reading"];

const FOCUS = ["Repertoire", "Scales", "Etudes", "Sight-Reading"] as const;

export default function SessionPage() {
  const router = useRouter();
  const {
    elapsed, paused, pieceName, focusType, notes,
    start, pause, resume, stop,
    setElapsed, setFocusType, setNotes, setPiece,
  } = useSessionStore();

  const [pieceSheetOpen, setPieceSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pieces, setPieces] = useState(PIECES);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let cancelled = false;

    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("pieces")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled || !data || data.length === 0) return;

      const loadedPieces = (data as PieceRow[]).map((piece) => ({
        id: piece.id,
        name: piece.name,
        composer: piece.composer ?? "",
        role: piece.role ?? "",
        progress: piece.progress / 100,
        weekTime: "",
        lastPracticed: "",
        totalSessions: 0,
      }));
      setPieces(loadedPieces);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (pieces.length === 0) return;
    const state = useSessionStore.getState();
    if (!state.pieceId) {
      setPiece(pieces[0].id, pieces[0].name);
    }
  }, [pieces, setPiece]);

  // Boot the worker on mount; tear down on unmount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = new Worker(new URL("../../../workers/timer-worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    w.onmessage = (e: MessageEvent<{ type: "TICK"; elapsed: number }>) => {
      if (e.data.type === "TICK") setElapsed(e.data.elapsed);
    };
    if (!useSessionStore.getState().inSession) {
      const first = pieces[0] ?? PIECES[0];
      start({ pieceId: first.id, pieceName: first.name });
    }
    w.postMessage({ type: "START", startTime: Date.now() });
    return () => { w.postMessage({ type: "STOP" }); w.terminate(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setElapsed, start]);

  // Forward pause/resume to the worker
  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: paused ? "PAUSE" : "RESUME" });
  }, [paused]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); paused ? resume() : pause(); }
      if (e.key === "Escape") { e.preventDefault(); setConfirmOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, pause, resume]);

  const endSession = async () => {
    const startTs = useSessionStore.getState().startTime ?? Date.now() - elapsed * 1000;
    const pieceId = useSessionStore.getState().pieceId;
    const endTs = Date.now();
    const lowerFocus = focusType.toLowerCase();

    await enqueue({
      id: crypto.randomUUID(),
      startedAt: startTs,
      endedAt: endTs,
      durationSec: elapsed,
      pieceId,
      focusType: lowerFocus,
      notes,
    });

    // If we're online and authed, flush to Supabase right now so the user
    // sees the session on /home. Otherwise it stays queued for next load.
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const pending = await drain();
          for (const s of pending) {
            const focus = VALID_FOCUS.includes(s.focusType as FocusType)
              ? (s.focusType as FocusType)
              : null;
            const { data: row } = await supabase.from("sessions").insert({
              user_id: user.id,
              started_at: new Date(s.startedAt).toISOString(),
              ended_at: new Date(s.endedAt).toISOString(),
              duration_sec: s.durationSec,
              focus_type: focus,
              notes: s.notes || null,
            }).select("id").single();
            if (row && s.pieceId) {
              await supabase.from("session_pieces").insert({
                session_id: row.id, piece_id: s.pieceId,
              });
            }
          }
        }
      } catch {
        // Network or RLS error — sessions stay in IndexedDB for next try.
      }
    }

    stop();
    router.push("/home");
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "var(--color-bg)",
      zIndex: 40,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 24px 12px" }}>
        <button onClick={() => setConfirmOpen(true)} className="press" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          fontSize: 12, color: "var(--color-text-secondary)",
          padding: "6px 10px", border: "0.5px solid var(--color-border)", borderRadius: 8,
        }}>
          <Icon name="arrow-left" size={14} /> End Session <Kbd>Esc</Kbd>
        </button>
        <button onClick={() => paused ? resume() : pause()} className="press" aria-label={paused ? "Resume" : "Pause"}
          style={{ width: 32, height: 32, display: "grid", placeItems: "center" }}>
          <Icon name={paused ? "play" : "pause"} size={22} />
        </button>
      </div>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 32, padding: "0 24px", overflow: "hidden",
      }}>
        <div style={{ opacity: paused ? 0.5 : 1, transition: "opacity 200ms ease" }}>
          <TimerDisplay seconds={elapsed} />
        </div>

        <button
          onClick={() => setPieceSheetOpen(true)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}
        >
          <div className="t-card-label" style={{ fontSize: 18 }}>{pieceName ?? "Free Practice"}</div>
          <div className="t-meta">Tap to switch piece</div>
        </button>

        <div className="chip-row" style={{ justifyContent: "center" }}>
          {FOCUS.map((f) => (
            <button
              key={f}
              className={`chip press ${focusType === f ? "active" : ""}`}
              onClick={() => setFocusType(f)}
            >{f}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 24px 24px", maxWidth: 720, width: "100%", margin: "0 auto" }}>
        <textarea
          className="textarea"
          placeholder="Add a note…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ minHeight: 64 }}
        />
        <button className="cta" style={{ marginTop: 16 }} onClick={() => setConfirmOpen(true)}>
          End Session
        </button>
      </div>

      <BottomSheet open={pieceSheetOpen} onClose={() => setPieceSheetOpen(false)} title="Switch Piece">
        <div className="col" style={{ gap: 8 }}>
          {pieces.map((p) => (
            <button
              key={p.id}
              className="press"
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: 16,
                background: useSessionStore.getState().pieceId === p.id ? "var(--color-card-fill-deep)" : "transparent",
                borderRadius: 12,
                borderBottom: "0.5px solid var(--color-border)",
              }}
              onClick={() => { setPiece(p.id, p.name); setPieceSheetOpen(false); }}
            >
              <div className="t-card-label">{p.name}</div>
              <div className="t-meta" style={{ marginTop: 4 }}>{p.composer}</div>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title="End session?">
        <div className="t-meta" style={{ marginBottom: 16 }}>This is what you've put in.</div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "0.5px solid var(--color-border)" }}>
            <span className="t-caption muted">Duration</span>
            <span className="t-card-label">{formatDuration(elapsed)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "0.5px solid var(--color-border)" }}>
            <span className="t-caption muted">Piece</span>
            <span className="t-card-label">{pieceName ?? "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0" }}>
            <span className="t-caption muted">Focus</span>
            <span className="t-card-label">{focusType}</span>
          </div>
        </div>
        <div className="row" style={{ gap: 12, marginTop: 20 }}>
          <button
            className="cta"
            style={{ background: "transparent", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border)" }}
            onClick={() => setConfirmOpen(false)}
          >Keep Going</button>
          <button className="cta" onClick={endSession}>Save & End</button>
        </div>
      </BottomSheet>
    </div>
  );
}
