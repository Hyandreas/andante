"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { RoomView } from "@/lib/app-data";

const moodLabel: Record<string, string> = {
  focused: "focused",
  intense: "intense",
  playful: "playful",
  monastic: "monastic",
};

interface RoomsPageClientProps {
  initialRooms: RoomView[];
}

const FILTERS = ["All", "Live now", "Mock Auditions", "Excerpts", "Bach", "Sight-Reading", "Asia · Tokyo/Seoul", "Eastern US"] as const;
type Filter = (typeof FILTERS)[number];

// Map a filter chip to a predicate over the rooms list. Chips with no sensible
// data-backed predicate (region buckets) fall back to matching room metadata.
function matchesFilter(room: RoomView, filter: Filter): boolean {
  switch (filter) {
    case "All": return true;
    case "Live now": return room.live;
    case "Mock Auditions": return /mock|audition/i.test(`${room.name} ${room.focus}`);
    case "Excerpts": return /excerpt/i.test(`${room.name} ${room.focus} ${room.piece}`);
    case "Bach": return /bach/i.test(`${room.name} ${room.piece}`);
    case "Sight-Reading": return /sight|reading/i.test(`${room.name} ${room.focus}`);
    case "Asia · Tokyo/Seoul": return /jp|kr|cn|🇯🇵|🇰🇷|🇨🇳|tokyo|seoul/i.test(`${room.region}`);
    case "Eastern US": return /us|🇺🇸|🇨🇦/i.test(`${room.region}`);
    default: return true;
  }
}

export function RoomsPageClient({ initialRooms }: RoomsPageClientProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [selectedRoom, setSelectedRoom] = useState<RoomView | null>(null);
  const [joining, setJoining] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");
  // Creating rooms / scheduling needs a live backend; in demo mode these CTAs
  // are inert, so we disable rather than fake them.
  const canCreate = isSupabaseConfigured();

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

    return () => { void supabase.removeChannel(channel); };
  }, []);

  const live = rooms.filter((room) => room.live);
  const totalIn = live.reduce((sum, room) => sum + room.count, 0);
  const filteredRooms = rooms.filter((room) => matchesFilter(room, filter));
  const hasRooms = rooms.length > 0;

  const openJoinSheet = (room: RoomView) => setSelectedRoom(room);

  const quickJoin = () => {
    const available = live.find((r) => r.count < r.max) ?? live[0];
    if (available) setSelectedRoom(available);
  };

  const joinRoom = async () => {
    if (!selectedRoom) return;
    setJoining(true);
    router.push(`/rooms/${selectedRoom.id}`);
  };

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
          <button
            className="press hidden md:!inline-block"
            disabled={!canCreate}
            title={canCreate ? undefined : "Available with a connected account"}
            style={{
              padding: "10px 16px", borderRadius: 10,
              border: "0.5px solid var(--color-border)", fontSize: 13,
              opacity: canCreate ? 1 : 0.5, cursor: canCreate ? "pointer" : "not-allowed",
            }}
          >Schedule mock audition{canCreate ? "" : " (demo)"}</button>
          <button
            className="press"
            disabled={!canCreate}
            title={canCreate ? undefined : "Available with a connected account"}
            style={{
              padding: "10px 18px", borderRadius: 10,
              background: "var(--color-text-primary)", color: "var(--color-bg)",
              fontSize: 13, fontWeight: 500,
              display: "inline-flex", alignItems: "center", gap: 8,
              opacity: canCreate ? 1 : 0.5, cursor: canCreate ? "pointer" : "not-allowed",
            }}
          >
            <Icon name="plus" size={14} /> Open a room{canCreate ? "" : " (demo)"}
          </button>
        </div>
      </div>

      {hasRooms && (
        <div className="chip-row no-scrollbar" style={{ marginTop: 18, marginBottom: 22, overflowX: "auto", flexWrap: "nowrap", paddingBottom: 4 }}>
          {FILTERS.map((chip) => (
            <button
              key={chip}
              onClick={() => setFilter(chip)}
              className={`chip press ${filter === chip ? "active" : ""}`}
            >{chip}</button>
          ))}
        </div>
      )}

      {/* Only show the live banner + quick-join when there's actually a live
          room to join — otherwise "Happening now: 0" reads as broken. */}
      {live.length > 0 && (
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
          <button className="press" onClick={quickJoin} style={{
            background: "var(--color-bg)", color: "var(--color-text-primary)",
            padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            justifySelf: "start",
          }}>Quick join →</button>
        </div>
      )}

      {rooms.length === 0 && (
        <EmptyState
          title="No rooms open right now"
          body="Practice rooms are quiet co-working spaces with synchronized timers — no chat, just shared focus. Open one and your cohort will fill in."
          icon={<Icon name="plus" size={18} />}
          action={
            <button className="press" style={{
              padding: "12px 22px", borderRadius: 10,
              background: "var(--color-text-primary)", color: "var(--color-bg)",
              fontSize: 14, fontWeight: 500,
              display: "inline-flex", alignItems: "center", gap: 10,
            }}>
              <Icon name="plus" size={14} /> Open the first room
            </button>
          }
        />
      )}

      {hasRooms && filteredRooms.length === 0 && (
        <div className="t-meta" style={{ padding: "8px 0 20px" }}>
          No rooms match “{filter}”. <button className="press" onClick={() => setFilter("All")} style={{ textDecoration: "underline", color: "var(--color-text-primary)" }}>Clear filter</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 14 }} className="md:!grid-cols-2 lg:!grid-cols-3">
        {filteredRooms.map((room, index) => (
          <button
            key={room.id}
            className="card press reveal-up"
            onClick={() => openJoinSheet(room)}
            style={{
              padding: 20, display: "flex", flexDirection: "column", gap: 12,
              animationDelay: `${index * 60}ms`,
              cursor: "pointer", position: "relative", overflow: "hidden",
              textAlign: "left", width: "100%",
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
          </button>
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

      {/* Join sheet */}
      <BottomSheet
        open={selectedRoom !== null}
        onClose={() => { if (!joining) setSelectedRoom(null); }}
        title={selectedRoom?.name ?? ""}
      >
        {selectedRoom && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderBottom: "0.5px solid var(--color-border)" }}>
                <span className="t-caption muted">Status</span>
                <span className="t-card-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {selectedRoom.live ? (
                    <>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--color-text-primary)", display: "inline-block", animation: "breathe 1.6s ease-in-out infinite" }} />
                      Live · {moodLabel[selectedRoom.mood]}
                    </>
                  ) : `Scheduled · ${selectedRoom.scheduled ?? ""}`}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderBottom: "0.5px solid var(--color-border)" }}>
                <span className="t-caption muted">Host</span>
                <span className="t-card-label">{selectedRoom.host}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderBottom: "0.5px solid var(--color-border)" }}>
                <span className="t-caption muted">Focus</span>
                <span className="t-card-label">{selectedRoom.focus}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderBottom: "0.5px solid var(--color-border)" }}>
                <span className="t-caption muted">Region</span>
                <span className="t-card-label">{selectedRoom.region}</span>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div className="t-caption muted" style={{ marginBottom: 8 }}>Seats</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  {Array.from({ length: selectedRoom.max }).map((_, i) => (
                    <div key={i} style={{
                      width: 16, height: 16, borderRadius: 5,
                      background: i < selectedRoom.count ? "var(--color-text-primary)" : "var(--color-track-empty)",
                    }} />
                  ))}
                  <span className="t-meta" style={{ marginLeft: 8 }}>{selectedRoom.count}/{selectedRoom.max} musicians</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="cta"
                style={{ background: "transparent", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border)" }}
                onClick={() => setSelectedRoom(null)}
                disabled={joining}
              >Cancel</button>
              <button
                className="cta"
                onClick={joinRoom}
                disabled={joining || (!selectedRoom.live && selectedRoom.count >= selectedRoom.max)}
              >
                {joining ? "Joining…" : selectedRoom.live ? "Join Room" : "Room not live yet"}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
