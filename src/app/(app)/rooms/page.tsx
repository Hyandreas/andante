import { RoomsPageClient } from "@/components/rooms/rooms-page-client";
import { getRoomsData } from "@/lib/app-data";

export default async function RoomsPage() {
  const rooms = await getRoomsData();

  return <RoomsPageClient initialRooms={rooms} />;
}
