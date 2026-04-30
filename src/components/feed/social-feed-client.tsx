"use client";

import dynamic from "next/dynamic";

const SocialFeed = dynamic(
  () => import("./social-feed").then((m) => ({ default: m.SocialFeed })),
  { ssr: false },
);

export function SocialFeedClient({ compact }: { compact?: boolean }) {
  return <SocialFeed compact={compact} />;
}
