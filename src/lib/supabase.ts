import { createClient } from "@supabase/supabase-js";

export type CityBuilding = {
  id: string;
  type: string;
  x: number;
  y: number;
  level: number;
  placedAt: string;
};

export type CityState = {
  buildings: CityBuilding[];
  coins: number;
  xp: number;
  cityLevel: number;
  lastSaved: string;
};

export type UserRow = {
  id: string;
  email: string;
  username: string;
  city_state: CityState;
  total_coins: number;
  total_xp: number;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
