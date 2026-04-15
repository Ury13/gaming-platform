"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Play",   icon: "🎮" },
  { href: "/city",  label: "City",   icon: "🏙" },
  { href: "/leaderboard", label: "Ranks",  icon: "🏆" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-t border-white/8"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch h-14">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative group"
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-yellow-400" />
              )}

              {/* Icon container */}
              <span className={`text-xl transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-105"}`}>
                {tab.icon}
              </span>

              <span className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                active ? "text-yellow-400" : "text-white/35 group-hover:text-white/60"
              }`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
