import { NextRequest, NextResponse } from "next/server";
import {
  getTopScores,
  getChampionsBoard,
  getDisplayNamesForUsers,
  getUserRank,
  isConfigured,
} from "@/lib/redis";
import { VALID_GAME_IDS, GAMES_META } from "@/lib/games";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("game") ?? "match3";
  const userId = searchParams.get("userId") ?? "";

  const configured = isConfigured();

  // ── Champions board — aggregate across all games ───────────────────
  if (gameId === "champions") {
    const entries = await getChampionsBoard(VALID_GAME_IDS, 10);
    const userIds = entries.map((e) => e.member);
    const names   = await getDisplayNamesForUsers(userIds);

    const board = entries.map((e, i) => ({
      rank:   i + 1,
      userId: e.member,
      name:   names[e.member] ?? e.member.slice(0, 8),
      score:  e.score,
    }));

    const yourRank  = board.findIndex((e) => e.userId === userId);
    return NextResponse.json({
      configured,
      board,
      yourRank:  yourRank >= 0 ? yourRank + 1 : null,
      yourScore: yourRank >= 0 ? board[yourRank].score : null,
    });
  }

  // ── Per-game board ─────────────────────────────────────────────────
  if (!VALID_GAME_IDS.includes(gameId)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }

  const entries = await getTopScores(gameId, 10);
  const userIds = entries.map((e) => e.member);
  const names   = await getDisplayNamesForUsers(userIds);

  const board = entries.map((e, i) => ({
    rank:   i + 1,
    userId: e.member,
    name:   names[e.member] ?? e.member.slice(0, 8),
    score:  e.score,
  }));

  let yourRank:  number | null = null;
  let yourScore: number | null = null;
  if (userId) {
    yourRank = await getUserRank(gameId, userId);
    const mine = entries.find((e) => e.member === userId);
    yourScore  = mine?.score ?? null;
  }

  return NextResponse.json({ configured, board, yourRank, yourScore });
}
