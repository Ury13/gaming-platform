"use client";

import { useEffect, useState, useCallback } from "react";
import { GAMES_META } from "@/lib/games";
import { getOrCreateUserId } from "@/lib/identity";

type Entry    = { rank: number; userId: string; name: string; score: number };
type BoardData = { configured: boolean; board: Entry[]; yourRank: number | null; yourScore: number | null };

// "champions" is a virtual tab; real game ids come from GAMES_META
type TabId = "champions" | typeof GAMES_META[number]["id"];

const TABS: Array<{ id: TabId; emoji: string; label: string; sub: string }> = [
  { id: "champions", emoji: "🏆", label: "Champions", sub: "All games combined" },
  ...GAMES_META.map((g) => ({ id: g.id as TabId, emoji: g.emoji, label: g.label, sub: "Individual leaderboard" })),
];

function rankLabel(rank: number) {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
}
function rankColour(rank: number) {
  return rank === 1 ? "text-yellow-400"
       : rank === 2 ? "text-slate-300"
       : rank === 3 ? "text-amber-500"
       : "text-white/30";
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("champions");
  const [data,      setData]      = useState<BoardData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [userId,    setUserId]    = useState("");

  useEffect(() => { setUserId(getOrCreateUserId()); }, []);

  const fetch_ = useCallback((tab: TabId, uid: string) => {
    if (!uid) return;
    setLoading(true);
    setData(null);
    fetch(`/api/leaderboard?game=${tab}&userId=${encodeURIComponent(uid)}`)
      .then((r) => r.json())
      .then((d: BoardData) => setData(d))
      .catch(() => setData({ configured: false, board: [], yourRank: null, yourScore: null }))
      .finally(() => setLoading(false));
  }, []);

  // Fetch when tab or userId changes
  useEffect(() => { fetch_(activeTab, userId); }, [activeTab, userId, fetch_]);

  // Auto-refresh every 30 s so newly submitted scores appear
  useEffect(() => {
    const id = setInterval(() => fetch_(activeTab, userId), 30_000);
    return () => clearInterval(id);
  }, [activeTab, userId, fetch_]);

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-white">

      {/* ── Horizontal tab strip ──────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-white/10 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? tab.id === "champions"
                      ? "border-yellow-400 text-yellow-300"
                      : "border-white text-white"
                    : "border-transparent text-white/40 hover:text-white/70"
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable board ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Header */}
        <div className={`px-4 pt-5 pb-3 flex items-center gap-3 ${
          activeTab === "champions" ? "bg-yellow-500/5" : ""
        }`}>
          <span className="text-3xl">{currentTab.emoji}</span>
          <div>
            <h1 className="font-bold text-lg leading-tight">{currentTab.label}</h1>
            <p className="text-white/40 text-xs">{currentTab.sub}</p>
          </div>
          {/* Manual refresh */}
          <button
            onClick={() => fetch_(activeTab, userId)}
            className="ml-auto text-white/30 hover:text-white/70 text-xs transition-colors px-2 py-1"
            aria-label="Refresh"
          >
            ↻
          </button>
        </div>

        <div className="px-4 pb-6 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
            ))
          ) : data && !data.configured ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <span className="text-4xl">🔌</span>
              <p className="text-white/70 text-sm font-semibold">Database not connected</p>
              <p className="text-white/40 text-xs leading-relaxed max-w-xs">
                Go to your Vercel project → <strong>Storage</strong> → add <strong>Upstash Redis</strong> from the marketplace, then redeploy.
              </p>
              <a
                href="/api/debug"
                target="_blank"
                className="text-xs text-blue-400 underline mt-1"
              >
                View connection diagnostics →
              </a>
            </div>
          ) : !data || data.board.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <span className="text-5xl opacity-60">{currentTab.emoji}</span>
              <p className="text-white/50 text-sm leading-relaxed">
                No scores yet.<br />
                {activeTab === "champions"
                  ? "Play any game to appear here!"
                  : `Be the first to play ${currentTab.label}!`}
              </p>
              <p className="text-white/25 text-xs">Scores appear ~8 s after earning them</p>
            </div>
          ) : (
            data.board.map((entry) => {
              const isYou = entry.userId === userId;
              return (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                    isYou
                      ? "bg-yellow-500/12 ring-1 ring-yellow-500/30"
                      : entry.rank <= 3
                      ? "bg-white/8"
                      : "bg-white/5"
                  }`}
                >
                  <span className={`w-8 text-center text-base font-bold flex-shrink-0 ${rankColour(entry.rank)}`}>
                    {rankLabel(entry.rank)}
                  </span>

                  <span className={`flex-1 font-semibold truncate text-sm ${isYou ? "text-yellow-300" : "text-white"}`}>
                    {isYou ? "You" : entry.name}
                  </span>

                  <span className="font-mono text-sm text-white/60 flex-shrink-0">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              );
            })
          )}

          {/* Your rank when outside top 10 */}
          {data && data.yourRank !== null && data.yourRank > 10 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/12 ring-1 ring-yellow-500/30 mt-2">
              <span className="w-8 text-center text-base font-bold flex-shrink-0 text-white/30">
                #{data.yourRank}
              </span>
              <span className="flex-1 font-semibold text-yellow-300 text-sm">You</span>
              <span className="font-mono text-sm text-white/60">
                {data.yourScore !== null ? data.yourScore.toLocaleString() : "—"}
              </span>
            </div>
          )}

          {data && data.board.length > 0 && (
            <p className="text-white/20 text-xs text-center pt-3">
              Updates every 8 s · auto-refreshes every 30 s
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
