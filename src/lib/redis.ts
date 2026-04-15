// Upstash Redis — connect via Vercel marketplace (Storage → Upstash → Redis).
// Handles both UPSTASH_* and KV_* env var names (Vercel injects either depending
// on the integration version).

import { Redis } from "@upstash/redis";

let _client: Redis | null | undefined = undefined;

function getUrl()   { return process.env.UPSTASH_REDIS_REST_URL   ?? process.env.KV_REST_API_URL   ?? ""; }
function getToken() { return process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? ""; }

function getClient(): Redis | null {
  if (_client !== undefined) return _client;
  const url   = getUrl();
  const token = getToken();
  if (!url || !token) { _client = null; return null; }
  try {
    _client = new Redis({ url, token });
  } catch {
    _client = null;
  }
  return _client;
}

export function isConfigured() {
  return !!(getUrl() && getToken());
}

const LB   = (gameId: string) => `lb:${gameId}`;
const NAME = (uid: string)    => `user:name:${uid}`;

/** Submit a score; only persists if it's a personal best. */
export async function submitScore(
  gameId: string,
  userId: string,
  score: number,
): Promise<{ isPersonalBest: boolean }> {
  const r = getClient();
  if (!r) return { isPersonalBest: false };
  try {
    const prev = await r.zscore(LB(gameId), userId);
    if (prev !== null && Number(prev) >= score) return { isPersonalBest: false };
    await r.zadd(LB(gameId), { score, member: userId });
    return { isPersonalBest: true };
  } catch (e) {
    console.error("[redis] submitScore error:", e);
    return { isPersonalBest: false };
  }
}

/** Top N entries for a game, highest score first. */
export async function getTopScores(
  gameId: string,
  count = 10,
): Promise<Array<{ member: string; score: number }>> {
  const r = getClient();
  if (!r) return [];
  try {
    const raw = await r.zrange(LB(gameId), 0, count - 1, { rev: true, withScores: true });
    if (!Array.isArray(raw) || raw.length === 0) return [];

    // @upstash/redis returns [{member, score}] objects when withScores:true.
    // Guard against the flat [member, score, ...] format just in case.
    if (typeof raw[0] === "object" && raw[0] !== null && "member" in (raw[0] as object)) {
      return raw as Array<{ member: string; score: number }>;
    }
    // Flat alternating array fallback
    const out: Array<{ member: string; score: number }> = [];
    for (let i = 0; i + 1 < raw.length; i += 2) {
      out.push({ member: String(raw[i]), score: Number(raw[i + 1]) });
    }
    return out;
  } catch (e) {
    console.error("[redis] getTopScores error:", e);
    return [];
  }
}

/** 1-indexed rank for a user, or null if unranked. */
export async function getUserRank(
  gameId: string,
  userId: string,
): Promise<number | null> {
  const r = getClient();
  if (!r) return null;
  try {
    const rank = await r.zrevrank(LB(gameId), userId);
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
  const r = getClient();
  if (!r) return;
  try { await r.set(NAME(userId), displayName.slice(0, 24)); } catch {}
}

/** Aggregate leaderboard — sums each player's best score across all games. */
export async function getChampionsBoard(
  gameIds: string[],
  count = 10,
): Promise<Array<{ member: string; score: number }>> {
  const r = getClient();
  if (!r) return [];
  try {
    const perGame = await Promise.all(gameIds.map((id) => getTopScores(id, 200)));
    const totals: Record<string, number> = {};
    for (const entries of perGame) {
      for (const e of entries) {
        totals[e.member] = (totals[e.member] ?? 0) + e.score;
      }
    }
    return Object.entries(totals)
      .map(([member, score]) => ({ member, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  } catch {
    return [];
  }
}

/** Batch-fetch display names; falls back to truncated userId. */
export async function getDisplayNamesForUsers(
  userIds: string[],
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const r = getClient();
  if (!r) return Object.fromEntries(userIds.map((id) => [id, id.slice(0, 8)]));
  try {
    const values = await r.mget<(string | null)[]>(...userIds.map(NAME));
    return Object.fromEntries(
      userIds.map((id, i) => [id, values[i] ?? id.slice(0, 8)]),
    );
  } catch {
    return Object.fromEntries(userIds.map((id) => [id, id.slice(0, 8)]));
  }
}
