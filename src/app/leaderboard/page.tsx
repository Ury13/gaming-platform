"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { GAMES_META } from "@/lib/games";
import { getOrCreateUserId } from "@/lib/identity";

type Entry = { rank: number; userId: string; name: string; score: number };
type BoardData = { board: Entry[]; yourRank: number | null; yourScore: number | null };

// ── Board content (needs Suspense because of useSearchParams) ──────────
function LeaderboardContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const gameId       = searchParams.get("game") ?? GAMES_META[0].id;

  const [data,    setData]    = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId,  setUserId]  = useState("");

  useEffect(() => { setUserId(getOrCreateUserId()); }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setData(null);
    fetch(`/api/leaderboard?game=${encodeURIComponent(gameId)}&userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d: BoardData) => setData(d))
      .catch(() => setData({ board: [], yourRank: null, yourScore: null }))
      .finally(() => setLoading(false));
  }, [gameId, userId]);

  const currentGame = GAMES_META.find((g) => g.id === gameId) ?? GAMES_META[0];

  const rankLabel = (rank: number) =>
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

  const rankColour = (rank: number) =>
    rank === 1 ? "text-yellow-400"
    : rank === 2 ? "text-slate-300"
    : rank === 3 ? "text-amber-500"
    : "text-white/30";

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-white">

      {/* ── Game tabs ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-white/10 overflow-x-auto">
        <div className="flex min-w-max">
          {GAMES_META.map((game) => {
            const active = game.id === gameId;
            return (
              <button
                key={game.id}
                onClick={() => router.push(`${pathname}?game=${game.id}`)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-white text-white"
                    : "border-transparent text-white/40 hover:text-white/70"
                }`}
              >
                <span>{game.emoji}</span>
                <span className="hidden sm:inline">{game.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable board ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex items-center gap-3">
          <span className="text-3xl">{currentGame.emoji}</span>
          <div>
            <h1 className="font-bold text-lg leading-tight">{currentGame.label}</h1>
            <p className="text-white/40 text-xs">Top players this week</p>
          </div>
        </div>

        <div className="px-4 pb-6 space-y-2">
          {loading ? (
            // Skeleton rows
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
            ))
          ) : !data || data.board.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <span className="text-5xl opacity-60">{currentGame.emoji}</span>
              <p className="text-white/50 text-sm leading-relaxed">
                No scores recorded yet.<br />
                Be the first to play {currentGame.label}!
              </p>
              <p className="text-white/25 text-xs">
                Scores appear here after a game session.
              </p>
            </div>
          ) : (
            // Board rows
            data.board.map((entry) => {
              const isYou = entry.userId === userId;
              return (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isYou
                      ? "bg-yellow-500/12 ring-1 ring-yellow-500/30"
                      : entry.rank <= 3
                      ? "bg-white/8"
                      : "bg-white/5"
                  }`}
                >
                  {/* Medal / rank */}
                  <span className={`w-8 text-center text-base font-bold flex-shrink-0 ${rankColour(entry.rank)}`}>
                    {rankLabel(entry.rank)}
                  </span>

                  {/* Name */}
                  <span
                    className={`flex-1 font-semibold truncate text-sm ${
                      isYou ? "text-yellow-300" : "text-white"
                    }`}
                  >
                    {isYou ? "You" : entry.name}
                  </span>

                  {/* Score */}
                  <span className="font-mono text-sm text-white/60 flex-shrink-0">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              );
            })
          )}

          {/* Your rank when outside top 10 */}
          {data && data.yourRank !== null && data.yourRank > 10 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/12 ring-1 ring-yellow-500/30 mt-4">
              <span className="w-8 text-center text-base font-bold flex-shrink-0 text-white/30">
                #{data.yourRank}
              </span>
              <span className="flex-1 font-semibold text-yellow-300 text-sm">You</span>
              <span className="font-mono text-sm text-white/60">
                {data.yourScore !== null ? data.yourScore.toLocaleString() : "—"}
              </span>
            </div>
          )}

          {/* Footer nudge */}
          <p className="text-white/25 text-xs text-center pt-4">
            Scores update after each game session
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page (wraps content in Suspense for useSearchParams) ──────────────
export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full bg-[#09090b]">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
