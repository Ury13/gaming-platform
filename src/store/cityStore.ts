"use client";

import { create } from "zustand";
import type { CityBuilding, CityState } from "@/lib/supabase";

type CityStore = {
  buildings: CityBuilding[];
  isDirty: boolean;

  placeBuilding: (type: string, x: number, y: number) => void;
  upgradeBuilding: (id: string) => void;
  removeBuilding: (id: string) => void;
  loadCity: (state: CityState) => void;
  markSaved: () => void;
};

export const useCityStore = create<CityStore>((set) => ({
  buildings: [],
  isDirty: false,

  placeBuilding: (type, x, y) =>
    set((state) => ({
      isDirty: true,
      buildings: [
        ...state.buildings,
        {
          id: crypto.randomUUID(),
          type,
          x,
          y,
          level: 1,
          placedAt: new Date().toISOString(),
        },
      ],
    })),

  upgradeBuilding: (id) =>
    set((state) => ({
      isDirty: true,
      buildings: state.buildings.map((b) =>
        b.id === id ? { ...b, level: b.level + 1 } : b
      ),
    })),

  removeBuilding: (id) =>
    set((state) => ({
      isDirty: true,
      buildings: state.buildings.filter((b) => b.id !== id),
    })),

  loadCity: (cityState) =>
    set({ buildings: cityState.buildings, isDirty: false }),

  markSaved: () => set({ isDirty: false }),
}));
