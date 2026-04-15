import { NextRequest, NextResponse } from "next/server";
import { submitScore, setUserDisplayName } from "@/lib/redis";
import { VALID_GAME_IDS } from "@/lib/games";

export async function POST(req: NextRequest) {
  try {
    const { gameId, userId, score, displayName } = await req.json();

    if (!VALID_GAME_IDS.includes(gameId)) {
      return NextResponse.json({ ok: false, error: "Invalid gameId" }, { status: 400 });
    }
    if (!userId || typeof score !== "number" || score < 0) {
      return NextResponse.json({ ok: false, error: "Missing or invalid fields" }, { status: 400 });
    }

    const { isPersonalBest } = await submitScore(gameId, String(userId), Math.round(score));

    if (displayName && typeof displayName === "string") {
      await setUserDisplayName(String(userId), displayName);
    }

    return NextResponse.json({ ok: true, isPersonalBest });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
