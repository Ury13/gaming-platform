// Diagnostic endpoint — visit /api/debug to see connection status.
// Safe to expose: shows only whether env vars are set, not their values.
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function GET() {
  const url   = process.env.UPSTASH_REDIS_REST_URL   ?? process.env.KV_REST_API_URL   ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

  const envVars = {
    UPSTASH_REDIS_REST_URL:   !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    KV_REST_API_URL:          !!process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN:        !!process.env.KV_REST_API_TOKEN,
  };

  if (!url || !token) {
    return NextResponse.json({
      ok: false,
      problem: "Redis env vars missing — add Upstash from Vercel Storage marketplace",
      envVars,
    });
  }

  // Try an actual write + read cycle
  try {
    const r = new Redis({ url, token });
    await r.set("debug:ping", "pong");
    const pong = await r.get("debug:ping");

    // Also check if any leaderboard data exists
    const sampleBoard = await r.zrange("lb:match3", 0, 2, { rev: true, withScores: true });

    return NextResponse.json({
      ok: true,
      ping: pong === "pong" ? "✅ Redis responding" : `❌ got: ${pong}`,
      sampleBoard,
      rawBoardType: Array.isArray(sampleBoard)
        ? sampleBoard.length > 0
          ? typeof sampleBoard[0]
          : "empty array"
        : typeof sampleBoard,
      envVars,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      problem: "Redis connected but threw an error",
      error: String(e),
      envVars,
    });
  }
}
