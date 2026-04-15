"use client";

import { useRewardEngine } from "@/store/rewardEngine";
import { useEffect, useRef } from "react";

function xpForLevel(n: number) { return (n - 1) ** 2 * 100; }

export default function HUD() {
  const { coins, xp, cityLevel } = useRewardEngine();
  const prevCoinsRef = useRef(coins);
  const coinFlashRef = useRef<HTMLSpanElement>(null);

  const prevXp = xpForLevel(cityLevel);
  const nextXp = xpForLevel(cityLevel + 1);
  const progress = Math.min(1, (xp - prevXp) / (nextXp - prevXp));

  // Flash animation on coin change
  useEffect(() => {
    if (coins !== prevCoinsRef.current && coinFlashRef.current) {
      coinFlashRef.current.classList.remove("coin-flash");
      void coinFlashRef.current.offsetWidth; // reflow
      coinFlashRef.current.classList.add("coin-flash");
      prevCoinsRef.current = coins;
    }
  }, [coins]);

  return (
    <div className="fixed top-0 left-0 right-0 z-40" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Main bar */}
      <div className="flex items-center justify-between px-4 h-11 bg-black/70 backdrop-blur-md border-b border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <span className="text-base">🏙</span>
          <span className="font-black text-white text-sm tracking-tight">City<span className="text-yellow-400">Swipe</span></span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/8 rounded-full px-3 py-1">
            <span className="text-sm">🪙</span>
            <span ref={coinFlashRef} className="text-yellow-300 font-bold text-sm tabular-nums">
              {coins >= 1000 ? `${(coins / 1000).toFixed(1)}k` : coins.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="text-right">
              <div className="text-white/40 text-[9px] font-semibold uppercase tracking-widest leading-none mb-0.5">
                Lv.{cityLevel}
              </div>
              <div className="text-blue-300 font-bold text-xs tabular-nums leading-none">
                {xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp} XP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="h-0.5 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700 ease-out"
          style={{ width: `${progress * 100}%`, boxShadow: "0 0 6px rgba(56,189,248,0.8)" }}
        />
      </div>
    </div>
  );
}
