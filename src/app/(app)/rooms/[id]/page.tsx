import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { RoomDetailClient } from "@/components/rooms/room-detail-client";
import { getRoomsData } from "@/lib/app-data";
import { requireProEntitlement } from "@/lib/entitlement-server";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Resolve the room from the SAME source as the rooms list (live Supabase when
// configured, demo fixtures otherwise) and find it by id. Never silently fall
// back to ROOMS[0] — an unknown id renders an honest "room not found" state.
export default async function RoomPage({ params }: PageProps) {
  await requireProEntitlement();
  const { id } = await params;
  const rooms = await getRoomsData();
  const room = rooms.find((r) => r.id === id);

  if (!room) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 40,
        background: "var(--color-bg)", display: "grid", placeItems: "center", padding: 24,
      }}>
        <EmptyState
          title="Room not found"
          body="This practice room may have closed or the link is out of date."
          icon={<Icon name="users" size={18} />}
          action={
            <Link href="/rooms" className="press" style={{
              padding: "12px 22px", borderRadius: 10,
              background: "var(--color-text-primary)", color: "var(--color-bg)",
              fontSize: 14, fontWeight: 500, textDecoration: "none",
            }}>
              Back to rooms
            </Link>
          }
        />
      </div>
    );
  }

  return <RoomDetailClient room={room} />;
}
