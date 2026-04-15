// Shared game metadata — usable in both server and client components.
// GameFeed.tsx merges this with canvas-specific fields (component, nativeW, nativeH).

export const GAMES_META = [
  { id: "match3",  label: "Gem Blast",    emoji: "💎", accent: "#a855f7", bg: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]" },
  { id: "runner",  label: "City Runner",  emoji: "🏃", accent: "#3b82f6", bg: "from-[#0f172a] via-[#1e3a5f] to-[#0c4a6e]" },
  { id: "stack",   label: "Stack City",   emoji: "🏗",  accent: "#f97316", bg: "from-[#0a0820] via-[#130d2e] to-[#1a103a]" },
  { id: "snake",   label: "Neon Snake",   emoji: "🐍", accent: "#22c55e", bg: "from-[#030c03] via-[#062006] to-[#083008]" },
  { id: "2048",    label: "City 2048",    emoji: "🔢", accent: "#f59e0b", bg: "from-[#1a0f00] via-[#2a1800] to-[#3a2000]" },
  { id: "bubble",  label: "Bubble Burst", emoji: "🫧", accent: "#22d3ee", bg: "from-[#001a1a] via-[#002020] to-[#003030]" },
] as const;

export type GameId = typeof GAMES_META[number]["id"];
export type GameMeta = typeof GAMES_META[number];

export const VALID_GAME_IDS = GAMES_META.map((g) => g.id) as string[];
