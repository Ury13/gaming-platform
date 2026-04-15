import { NextRequest, NextResponse } from "next/server";
import { getTopScores, getDisplayNamesForUsers, getUserRank } from "@/lib/redis";
import { VALID_GAME_IDS } from "@/lib/games";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("game") ?? "match3";
  const userId = searchParams.get("userId") ?? "";

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

  return NextResponse.json({ board, yourRank, yourScore });
}
