"use client";

import dynamic from "next/dynamic";

const GameFeed = dynamic(() => import("@/games/GameFeed"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-black">
      <div className="text-white/50 text-sm">Loading games...</div>
    </div>
  ),
});

export default function HomePage() {
  return (
    <div className="h-full w-full">
      <GameFeed />
    </div>
  );
}
