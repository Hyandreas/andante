import { RoomsPageClient } from "@/components/rooms/rooms-page-client";
import { getRoomsData } from "@/lib/app-data";
import { requireProEntitlement } from "@/lib/entitlement-server";

export default async function RoomsPage() {
  await requireProEntitlement();
  const rooms = await getRoomsData();

  return <RoomsPageClient initialRooms={rooms} />;
}
