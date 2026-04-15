"use client";

import dynamic from "next/dynamic";

const CityCanvas = dynamic(() => import("@/city/CityCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-slate-900">
      <div className="text-white/50 text-sm">Loading city...</div>
    </div>
  ),
});

export default function CityPage() {
  return (
    <div className="h-full w-full">
      <CityCanvas />
    </div>
  );
}
