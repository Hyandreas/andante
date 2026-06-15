"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { TimerDisplay } from "@/components/ui/timer-display";
import { useSessionStore } from "@/store/session-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { enqueue } from "@/lib/offline-sessions";
import { isSupabaseConfigured } from "@/lib/env";
import type { RoomView } from "@/lib/app-data";

const FOCUS = ["Repertoire", "Scales", "Etudes", "Sight-Reading"] as const;

const moodLabel: Record<string, string> = {
  focused: "focused",
  intense: "intense",
  playful: "playful",
  monastic: "monastic",
};

const FOCUS_DB: Record<(typeof FOCUS)[number], "repertoire" | "scales" | "etudes" | "sight-reading"> = {
  Repertoire: "repertoire",
  Scales: "scales",
  Etudes: "etudes",
  "Sight-Reading": "sight-reading",
};

export function RoomDetailClient({ room }: { room: RoomView }) {
  const router = useRouter();
  const { elapsed, paused, focusType, start, pause, resume, stop, setElapsed, setFocusType } = useSessionStore();

  const [seatCount, setSeatCount] = useState(room.count);
  // True if entering the room hijacked an already-active session (we don't
  // destroy it; we just refuse to start a fresh room timer over it).
  const [reusedExistingSession, setReusedExistingSession] = useState(false);

  // Start a room session on mount — but never clobber an in-progress session.
  useEffect(() => {
    if (useSessionStore.getState().inSession) {
      setReusedExistingSession(true);
    } else {
      start({ pieceId: undefined, pieceName: room.piece });
      // Optimistically reflect our own seat immediately in demo mode.
      if (!isSupabaseConfigured()) setSeatCount((c) => Math.min(room.max, c + 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer tick — always recompute from wall-clock so background throttling
  // self-corrects.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const s = useSessionStore.getState();
      if (!s.startTime) return;
      const seconds = Math.floor((Date.now() - s.startTime - s.pausedTotal) / 1000);
      setElapsed(seconds);
    }, 250);
    return () => clearInterval(id);
  }, [paused, setElapsed]);

  // Insert seat on mount, remove on unmount.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    let userId: string | null = null;

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
      await supabase.from("room_seats").upsert({ room_id: room.id, user_id: user.id }).select();
    })();

    return () => {
      if (!userId) return;
      void supabase.from("room_seats").delete().eq("room_id", room.id).eq("user_id", userId);
    };
  }, [room.id]);

  // Live seat count via Realtime.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`room-${room.id}-seats`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_seats", filter: `room_id=eq.${room.id}` }, async () => {
        const { count } = await supabase.from("room_seats").select("*", { count: "exact", head: true }).eq("room_id", room.id);
        if (count != null) setSeatCount(count);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [room.id]);

  // Leave the room. Instead of discarding the in-progress time, flush it to the
  // normal end-session save path (Supabase when online, otherwise IndexedDB) so
  // practice minutes aren't silently lost. If we reused a pre-existing session
  // (entered the room mid-session), we leave that session intact.
  const leaveRoom = async () => {
    const state = useSessionStore.getState();

    if (reusedExistingSession) {
      router.push("/rooms");
      return;
    }

    if (state.inSession && state.startTime != null) {
      const startTs = state.startTime;
      const endTs = Date.now();
      const durationSec = Math.max(0, Math.floor((endTs - startTs - state.pausedTotal) / 1000));

      const pending = {
        id: crypto.randomUUID(),
        startedAt: startTs,
        endedAt: endTs,
        durationSec,
        pieceId: state.pieceId,
        sheetMusicIds: [] as string[],
        sessionMode: "practice" as const,
        entryPathwayId: null,
        entryRequirementId: null,
        focusType: FOCUS_DB[state.focusType],
        notes: "",
      };

      let saved = false;
      if (durationSec > 0 && isSupabaseConfigured() && navigator.onLine) {
        try {
          const supabase = getSupabaseBrowserClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: row } = await supabase
              .from("sessions")
              .insert({
                user_id: user.id,
                started_at: new Date(startTs).toISOString(),
                ended_at: new Date(endTs).toISOString(),
                duration_sec: durationSec,
                focus_type: pending.focusType,
                session_mode: "practice",
              } as never)
              .select("id")
              .single();
            if (row?.id) {
              saved = true;
              if (state.pieceId) {
                await supabase.from("session_pieces").insert({ session_id: row.id, piece_id: state.pieceId } as never);
              }
            }
          }
        } catch {
          // Fall through to offline queue.
        }
      }

      if (!saved && durationSec > 0) {
        try { await enqueue(pending); } catch {}
      }
    }

    stop();
    router.push("/rooms");
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " ") { e.preventDefault(); paused ? resume() : pause(); }
      if (e.key === "Escape") { e.preventDefault(); void leaveRoom(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "var(--color-bg)",
      zIndex: 40,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 24px 12px" }}>
        <button onClick={leaveRoom} className="press" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          fontSize: 12, color: "var(--color-text-secondary)",
          padding: "6px 10px", border: "0.5px solid var(--color-border)", borderRadius: 8,
        }}>
          <Icon name="arrow-left" size={14} /> Leave Room
        </button>
        <button onClick={() => paused ? resume() : pause()} className="press" aria-label={paused ? "Resume" : "Pause"}
          style={{ width: 32, height: 32, display: "grid", placeItems: "center" }}>
          <Icon name={paused ? "play" : "pause"} size={22} />
        </button>
      </div>

      {/* Main */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 28, padding: "0 24px", overflow: "hidden",
      }}>
        <div style={{ opacity: paused ? 0.5 : 1, transition: "opacity 200ms ease" }}>
          <TimerDisplay seconds={elapsed} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div className="t-card-label" style={{ fontSize: 18 }}>{room.name}</div>
          <div className="t-meta">{room.region} · hosted by {room.host} · {moodLabel[room.mood]}</div>
        </div>

        {/* Seat grid */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
            {Array.from({ length: room.max }).map((_, i) => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: 5,
                background: i < seatCount ? "var(--color-text-primary)" : "var(--color-track-empty)",
                transition: "background 220ms ease",
              }} />
            ))}
          </div>
          <div className="t-meta">{seatCount}/{room.max} musicians in this room</div>
        </div>

        {/* Focus chips */}
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

      {/* Footer */}
      <div style={{ padding: "0 24px 32px" }}>
        <button className="cta" onClick={leaveRoom}>Leave Room</button>
      </div>
    </div>
  );
}
