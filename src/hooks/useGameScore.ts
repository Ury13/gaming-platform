"use client";

import { useRef, useEffect, useCallback } from "react";
import { getOrCreateUserId, getDisplayName } from "@/lib/identity";

/**
 * Tracks the player's best score for a game session and submits it to the
 * leaderboard API on unmount (fire-and-forget, keepalive so it survives tab close).
 *
 * Usage:
 *   const { record } = useGameScore("match3");
 *   // call record(score) whenever the score changes — hook keeps the max
 */
export function useGameScore(gameId: string) {
  const best      = useRef(0);
  const gameIdRef = useRef(gameId);
  gameIdRef.current = gameId;

  // Stable reference — useCallback with empty deps keeps identity across renders.
  // Safe to include in effect dependency arrays without causing extra runs.
  const record = useCallback((score: number) => {
    if (score > best.current) best.current = score;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (best.current <= 0) return;
      try {
        const userId      = getOrCreateUserId();
        const displayName = getDisplayName();
        fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId:      gameIdRef.current,
            userId,
            score:       best.current,
            displayName,
          }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    };
  }, []); // intentionally empty — runs only on unmount

  return { record };
}
