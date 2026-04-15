// Vercel KV — provisioned directly in the Vercel dashboard under Storage → KV.
// Env vars (KV_REST_API_URL / KV_REST_API_TOKEN) are injected automatically
// by Vercel; locally they won't exist, so every function falls back gracefully.

import { kv } from "@vercel/kv";

function isConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL || process.env.KV_URL);
}

const LB   = (gameId: string) => `lb:${gameId}`;
const NAME = (uid: string)    => `user:name:${uid}`;

/** Submit a score; only persists if it's a personal best. */
export async function submitScore(
  gameId: string,
  userId: string,
  score: number,
): Promise<{ isPersonalBest: boolean }> {
  if (!isConfigured()) return { isPersonalBest: false };
  try {
    const prev = await kv.zscore(LB(gameId), userId);
    if (prev !== null && Number(prev) >= score) return { isPersonalBest: false };
    await kv.zadd(LB(gameId), { score, member: userId });
    return { isPersonalBest: true };
  } catch {
    return { isPersonalBest: false };
  }
}

/** Top N entries for a game, highest score first. */
export async function getTopScores(
  gameId: string,
  count = 10,
): Promise<Array<{ member: string; score: number }>> {
  if (!isConfigured()) return [];
  try {
    const raw = await kv.zrange(LB(gameId), 0, count - 1, { rev: true, withScores: true });
    if (!Array.isArray(raw)) return [];
    return (raw as Array<{ member: string; score: number }>).filter(
      (e) => e && typeof e === "object" && "member" in e,
    );
  } catch {
    return [];
  }
}

/** 1-indexed rank for a user, or null if unranked. */
export async function getUserRank(
  gameId: string,
  userId: string,
): Promise<number | null> {
  if (!isConfigured()) return null;
  try {
    const rank = await kv.zrevrank(LB(gameId), userId);
    return rank === null ? null : rank + 1;
  } catch {
    return null;
  }
}

/** Store / update display name for a user. */
export async function setUserDisplayName(
  userId: string,
  displayName: string,
): Promise<void> {
  if (!isConfigured()) return;
  try {
    await kv.set(NAME(userId), displayName.slice(0, 24));
  } catch {}
}

/** Batch-fetch display names; falls back to truncated userId. */
export async function getDisplayNamesForUsers(
  userIds: string[],
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  if (!isConfigured()) return Object.fromEntries(userIds.map((id) => [id, id.slice(0, 8)]));
  try {
    const values = await kv.mget<(string | null)[]>(...userIds.map(NAME));
    return Object.fromEntries(
      userIds.map((id, i) => [id, values[i] ?? id.slice(0, 8)]),
    );
  } catch {
    return Object.fromEntries(userIds.map((id) => [id, id.slice(0, 8)]));
  }
}
