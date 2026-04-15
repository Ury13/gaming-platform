"use client";

import { useRef, useEffect, useCallback } from "react";
import { getOrCreateUserId, getDisplayName } from "@/lib/identity";

// Submit 8 s after the last scoring action — so the board updates while you
// are still playing, not only when you navigate away.
const DEBOUNCE_MS = 8_000;

export function useGameScore(gameId: string) {
  const best      = useRef(0);
  const gameIdRef = useRef(gameId);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  gameIdRef.current = gameId;

  function doSubmit(score: number) {
    if (score <= 0) return;
    try {
      const userId      = getOrCreateUserId();
      const displayName = getDisplayName();
      fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: gameIdRef.current, userId, score, displayName }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }

  // Stable reference — safe to put in effect dependency arrays.
  const record = useCallback((score: number) => {
    if (score <= best.current) return;
    best.current = score;
    // Debounced: fires 8 s after the last update.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSubmit(score), DEBOUNCE_MS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Also submit immediately on unmount (navigation / swipe away).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      doSubmit(best.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { record };
}
