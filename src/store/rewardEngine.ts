"use client";

import { create } from "zustand";

export type Reward = {
  coins?: number;
  xp?: number;
  buildingId?: string; // unlocked building type
  message?: string;
};

export type RewardToast = Reward & {
  id: string;
  timestamp: number;
};

type RewardState = {
  coins: number;
  xp: number;
  cityLevel: number;
  toasts: RewardToast[];
  unlockedBuildings: string[];

  earn: (reward: Reward) => void;
  /** Deduct coins. Returns true on success, false if insufficient funds. */
  spend: (amount: number) => boolean;
  dismissToast: (id: string) => void;
  hydrate: (coins: number, xp: number, cityLevel: number, unlocked: string[]) => void;
};

function calcCityLevel(xp: number) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export const useRewardEngine = create<RewardState>((set, get) => ({
  coins: 0,
  xp: 0,
  cityLevel: 1,
  toasts: [],
  unlockedBuildings: [],

  earn: (reward) => {
    const toast: RewardToast = {
      ...reward,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    set((state) => {
      const newCoins = state.coins + (reward.coins ?? 0);
      const newXp = state.xp + (reward.xp ?? 0);
      const newLevel = calcCityLevel(newXp);
      const newUnlocked = reward.buildingId
        ? [...new Set([...state.unlockedBuildings, reward.buildingId])]
        : state.unlockedBuildings;

      return {
        coins: newCoins,
        xp: newXp,
        cityLevel: newLevel,
        unlockedBuildings: newUnlocked,
        toasts: [...state.toasts, toast],
      };
    });

    // Auto-dismiss toast after 3s
    setTimeout(() => get().dismissToast(toast.id), 3000);

    // Persist to backend (fire-and-forget)
    fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coins: reward.coins, xp: reward.xp }),
    }).catch(() => {});
  },

  spend: (amount) => {
    const { coins } = get();
    if (coins < amount) return false;
    set({ coins: coins - amount });
    return true;
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  hydrate: (coins, xp, cityLevel, unlocked) =>
    set({ coins, xp, cityLevel, unlockedBuildings: unlocked }),
}));
