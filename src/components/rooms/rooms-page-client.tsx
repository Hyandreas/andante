"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { RoomView } from "@/lib/app-data";

const moodLabel = {
  focused: "focused",
  intense: "intense",
  playful: "playful",
  monastic: "monastic",
};

interface RoomsPageClientProps {
  initialRooms: RoomView[];
}

export function RoomsPageClient({ initialRooms }: RoomsPageClientProps) {
  const [rooms, setRooms] = useState(initialRooms);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("room-seats-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_seats" },
        (payload) => {
          setRooms((current) =>
            current.map((room) => {
              const nextRow = payload.new as { room_id?: string } | null;
              const prevRow = payload.old as { room_id?: string } | null;
              const newRoomId = typeof nextRow?.room_id === "string" ? nextRow.room_id : null;
              const oldRoomId = typeof prevRow?.room_id === "string" ? prevRow.room_id : null;

              if (payload.eventType === "INSERT" && room.id === newRoomId) {
                return { ...room, count: Math.min(room.max, room.count + 1) };
              }

              if (payload.eventType === "DELETE" && room.id === oldRoomId) {
                return { ...room, count: Math.max(0, room.count - 1) };
              }

              return room;
            }),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const live = rooms.filter((room) => room.live);
  const totalIn = live.reduce((sum, room) => sum + room.count, 0);

  return (
    <div style={{ flex: 1, padding: "32px 24px 48px", overflowY: "auto" }} className="lg:!px-10">
      <div className="row-between" style={{ marginBottom: 12, gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div className="t-section" style={{ fontSize: 24 }}>Practice Rooms</div>
          <div className="t-meta" style={{ marginTop: 4 }}>
            Quiet co-working with timers, not chat. {live.length} live now · {totalIn} musicians together.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="press hidden md:!inline-block" style={{
            padding: "10px 16px", borderRadius: 10,
            border: "0.5px solid var(--color-border)", fontSize: 13,
          }}>Schedule mock audition</button>
          <button className="press" style={{
            padding: "10px 18px", borderRadius: 10,
            background: "var(--color-text-primary)", color: "var(--color-bg)",
            fontSize: 13, fontWeight: 500,
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            <Icon name="plus" size={14} /> Open a room
          </button>
        </div>
      </div>

      <div className="chip-row no-scrollbar" style={{ marginTop: 18, marginBottom: 22, overflowX: "auto", flexWrap: "nowrap", paddingBottom: 4 }}>
        {["All", "Live now", "Mock Auditions", "Excerpts", "Bach", "Sight-Reading", "Asia · Tokyo/Seoul", "Eastern US"].map((chip, index) => (
          <button key={chip} className={`chip press ${index === 0 ? "active" : ""}`}>{chip}</button>
        ))}
      </div>

      <div style={{
        background: "var(--color-text-primary)", color: "var(--color-bg)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 18,
        display: "grid", gap: 14, alignItems: "center",
      }} className="lg:!grid-cols-[auto_1fr_auto]">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 7, height: 7, borderRadius: 999,
            background: "var(--color-bg)",
            animation: "breathe 1.6s ease-in-out infinite",
          }} />
          <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.7 }}>Happening now</span>
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 12, opacity: 0.85, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          <span><b>{totalIn}</b> in rooms</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span><b>{rooms.filter((room) => !room.live).length}</b> scheduled</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>Seat counts update live</span>
        </div>
        <button className="press" style={{
          background: "var(--color-bg)", color: "var(--color-text-primary)",
          padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
          justifySelf: "start",
        }}>Quick join →</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 14 }} className="md:!grid-cols-2 lg:!grid-cols-3">
        {rooms.map((room, index) => (
          <div
            key={room.id}
            className="card press reveal-up"
            style={{
              padding: 20, display: "flex", flexDirection: "column", gap: 12,
              animationDelay: `${index * 60}ms`,
              cursor: "pointer", position: "relative", overflow: "hidden",
            }}
          >
            {room.live ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: 999,
                  background: "var(--color-text-primary)",
                  animation: "breathe 1.6s ease-in-out infinite",
                }} />
                <span className="t-micro" style={{ color: "var(--color-text-primary)" }}>
                  LIVE · {moodLabel[room.mood]}
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--color-text-muted)" }} />
                <span className="t-micro">SCHEDULED</span>
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: -0.2, lineHeight: 1.25 }}>{room.name}</div>
            <div className="t-meta">{room.piece}</div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              {Array.from({ length: room.max }).map((_, seatIndex) => (
                <div
                  key={seatIndex}
                  style={{
                    width: 14, height: 14, borderRadius: 4,
                    background: seatIndex < room.count ? "var(--color-text-primary)" : "var(--color-track-empty)",
                    transition: "background 220ms ease",
                  }}
                />
              ))}
            </div>

            <div className="row-between" style={{ paddingTop: 10, borderTop: "0.5px solid var(--color-border)" }}>
              <div className="t-meta">{room.region} · hosted by {room.host}</div>
              <div className="t-micro" style={{ fontVariantNumeric: "tabular-nums" }}>{room.count}/{room.max}</div>
            </div>

            {!room.live && room.scheduled && (
              <div className="t-micro" style={{ marginTop: -4 }}>{room.scheduled}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 32, padding: 20,
        border: "0.5px dashed var(--color-border)",
        borderRadius: 10,
        display: "grid", gap: 24,
      }} className="md:!grid-cols-3">
        {[
          ["Quiet by default", "Mics off, no chat. Just synchronized timers and a shared focus chip."],
          ["Bring your loop", "Hit Loop Trainer in-room. Everyone sees the bar count, no one hears your wrong notes."],
          ["Mock audition mode", "Schedule a 4-seat room. You play, they listen. Anonymous timestamped notes appear after."],
        ].map(([heading, description], index) => (
          <div key={index} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{heading}</div>
            <div className="t-meta" style={{ lineHeight: 1.5 }}>{description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
