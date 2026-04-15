"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import GameScaler from "@/components/GameScaler";

const Match3Game  = dynamic(() => import("./match3/Match3Game"),    { ssr: false, loading: () => <GameLoader /> });
const RunnerGame  = dynamic(() => import("./runner/RunnerGame"),    { ssr: false, loading: () => <GameLoader /> });
const StackGame   = dynamic(() => import("./stack/StackGame"),      { ssr: false, loading: () => <GameLoader /> });
const SnakeGame   = dynamic(() => import("./snake/SnakeGame"),      { ssr: false, loading: () => <GameLoader /> });
const Game2048    = dynamic(() => import("./tiles2048/Game2048"),   { ssr: false, loading: () => <GameLoader /> });
const BubbleGame  = dynamic(() => import("./bubble/BubbleGame"),   { ssr: false, loading: () => <GameLoader /> });

function GameLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black/60 gap-4">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}

// nativeW / nativeH = exact canvas pixel dimensions inside each game.
// GameScaler uses these to calculate the CSS scale that fills the viewport.
const GAMES = [
  { id: "match3",  label: "Gem Blast",    genre: "Match-3",    emoji: "💎", bg: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",   nativeW: 288, nativeH: 424, component: Match3Game },
  { id: "runner",  label: "City Runner",  genre: "Runner",     emoji: "🏃", bg: "from-[#0f172a] via-[#1e3a5f] to-[#0c4a6e]",   nativeW: 360, nativeH: 480, component: RunnerGame },
  { id: "stack",   label: "Stack City",   genre: "Precision",  emoji: "🏗", bg: "from-[#0a0820] via-[#130d2e] to-[#1a103a]",   nativeW: 320, nativeH: 500, component: StackGame  },
  { id: "snake",   label: "Neon Snake",   genre: "Classic",    emoji: "🐍", bg: "from-[#030c03] via-[#062006] to-[#083008]",   nativeW: 306, nativeH: 374, component: SnakeGame  },
  { id: "2048",    label: "City 2048",    genre: "Puzzle",     emoji: "🔢", bg: "from-[#1a0f00] via-[#2a1800] to-[#3a2000]",   nativeW: 320, nativeH: 480, component: Game2048   },
  { id: "bubble",  label: "Bubble Burst", genre: "Strategy",   emoji: "🫧", bg: "from-[#001a1a] via-[#002020] to-[#003030]",   nativeW: 320, nativeH: 500, component: BubbleGame },
];

const GENRE_COLORS: Record<string, string> = {
  "Match-3":  "bg-purple-500/30 text-purple-200 border-purple-500/40",
  "Runner":   "bg-blue-500/30 text-blue-200 border-blue-500/40",
  "Precision":"bg-orange-500/30 text-orange-200 border-orange-500/40",
  "Classic":  "bg-green-500/30 text-green-200 border-green-500/40",
  "Puzzle":   "bg-yellow-500/30 text-yellow-200 border-yellow-500/40",
  "Strategy": "bg-teal-500/30 text-teal-200 border-teal-500/40",
};

export default function GameFeed() {
  const [current, setCurrent] = useState(0);
  const [mounted, setMounted] = useState(new Set([0]));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= GAMES.length || isTransitioning) return;
    setIsTransitioning(true);
    setMounted((prev) => {
      const next = new Set(prev);
      next.add(index);
      if (index + 1 < GAMES.length) next.add(index + 1);
      if (index - 1 >= 0) next.add(index - 1);
      return next;
    });
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 480);
  }, [isTransitioning]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchStartY.current - e.changedTouches[0].clientY;
      const dx = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
      // Only switch if swipe is predominantly vertical and significant
      if (Math.abs(dy) < 90 || dx > Math.abs(dy) * 0.6) return;
      if (dy > 0) goTo(current + 1);
      else goTo(current - 1);
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 40) return;
      if (e.deltaY > 0) goTo(current + 1);
      else goTo(current - 1);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [current, goTo]);

  const game = GAMES[current];

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      {/* Slides */}
      {GAMES.map((g, i) => {
        if (!mounted.has(i)) return null;
        const offset = (i - current) * 100;
        const GameComp = g.component;
        return (
          <div
            key={g.id}
            className={`absolute inset-0 bg-gradient-to-b ${g.bg}`}
            style={{
              transform: `translateY(${offset}%)`,
              transition: "transform 0.46s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              willChange: "transform",
            }}
          >
            <GameScaler nativeW={g.nativeW} nativeH={g.nativeH}>
              <GameComp />
            </GameScaler>
          </div>
        );
      })}

      {/* Bottom overlay — TikTok style info strip */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)" }}
      >
        <div className="px-4 pb-4 pt-16">
          <div className="flex items-end justify-between">
            <div className="flex-1 min-w-0 pr-14">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{game.emoji}</span>
                <span className="text-white font-bold text-xl leading-tight">{game.label}</span>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${GENRE_COLORS[game.genre] ?? "bg-white/10 text-white/70 border-white/20"}`}>
                {game.genre}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar — TikTok action buttons */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
        {/* Dot navigation */}
        {GAMES.map((g, i) => (
          <button
            key={g.id}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-2 h-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                : "w-2 h-2 bg-white/25 hover:bg-white/50"
            }`}
            aria-label={`Switch to ${g.label}`}
          />
        ))}
      </div>

      {/* Swipe hint arrows */}
      {current > 0 && (
        <button
          onClick={() => goTo(current - 1)}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white/50 hover:bg-white/20 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
      {current < GAMES.length - 1 && (
        <button
          onClick={() => goTo(current + 1)}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white/50 hover:bg-white/20 hover:text-white transition-all animate-pulse-slow"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}
