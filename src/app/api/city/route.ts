import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // TODO: fetch city state from Supabase for authenticated user
  return NextResponse.json({ buildings: [], coins: 0, xp: 0, cityLevel: 1 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // TODO: save city state to Supabase
    return NextResponse.json({ ok: true, saved: body });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
