"use client";

import { useEffect, useRef } from "react";
import { useCityStore } from "@/store/cityStore";
import { useRewardEngine } from "@/store/rewardEngine";

const LS_CITY   = "cs_city_v1";
const LS_REWARD = "cs_reward_v1";
const DEBOUNCE  = 2000;

/** Loads city + reward state from localStorage on mount, auto-saves on changes. */
export function useCityPersistence() {
  const { buildings, isDirty, loadCity, markSaved } = useCityStore();
  const { coins, xp, cityLevel, unlockedBuildings, hydrate } = useRewardEngine();
  const cityTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load on mount ─────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CITY);
      if (raw) loadCity(JSON.parse(raw));
    } catch {}

    try {
      const raw = localStorage.getItem(LS_REWARD);
      if (raw) {
        const { coins = 0, xp = 0, cityLevel = 1, unlockedBuildings = [] } = JSON.parse(raw);
        hydrate(coins, xp, cityLevel, unlockedBuildings);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save city on dirty ─────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    if (cityTimer.current) clearTimeout(cityTimer.current);
    cityTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(LS_CITY, JSON.stringify({ buildings, lastSaved: new Date().toISOString() }));
        markSaved();
      } catch {}
    }, DEBOUNCE);
    return () => { if (cityTimer.current) clearTimeout(cityTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, buildings]);

  // ── Save reward state on change ────────────────────
  useEffect(() => {
    if (rewardTimer.current) clearTimeout(rewardTimer.current);
    rewardTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(LS_REWARD, JSON.stringify({ coins, xp, cityLevel, unlockedBuildings }));
      } catch {}
    }, DEBOUNCE);
    return () => { if (rewardTimer.current) clearTimeout(rewardTimer.current); };
  }, [coins, xp, cityLevel, unlockedBuildings]);
}
