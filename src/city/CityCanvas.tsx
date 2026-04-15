"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCityStore } from "@/store/cityStore";
import { useRewardEngine } from "@/store/rewardEngine";
import { useCityPersistence } from "./useCityPersistence";
import { BUILDING_DEFS, ALL_BUILDING_IDS } from "./buildingDefs";

const SZ   = 64;  // cell size
const COLS = 8;
const ROWS = 10;
const W    = COLS * SZ;
const H    = ROWS * SZ;

// ── Confirmation dialog state ──────────────────────────────────────────
type ConfirmTarget = { id: string; type: string; level: number; col: number; row: number } | null;

// ── Shake feedback ─────────────────────────────────────────────────────
function useShake(): [boolean, () => void] {
  const [shaking, setShaking] = useState(false);
  const trigger = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
  }, []);
  return [shaking, trigger];
}

export default function CityCanvas() {
  // ── Persistence (auto-saves on changes) ───────────────────────────
  useCityPersistence();

  // ── Store selectors ────────────────────────────────────────────────
  const buildings       = useCityStore((s) => s.buildings);
  const placeBuilding   = useCityStore((s) => s.placeBuilding);
  const removeBuilding  = useCityStore((s) => s.removeBuilding);
  const upgradeBuilding = useCityStore((s) => s.upgradeBuilding);
  const coins     = useRewardEngine((s) => s.coins);
  const xp        = useRewardEngine((s) => s.xp);
  const spend     = useRewardEngine((s) => s.spend);
  const unlockedBuildings = useRewardEngine((s) => s.unlockedBuildings);

  // ── Local UI state ─────────────────────────────────────────────────
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const [placing, setPlacing]     = useState<string | null>(null);   // building type being placed
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [confirm, setConfirm]     = useState<ConfirmTarget>(null);
  const [shakeBuildingId, shakeBuilding] = useShake();

  // Keep refs in sync for the canvas draw loop (avoids stale closures)
  const buildingsRef  = useRef(buildings);
  const hoverCellRef  = useRef(hoverCell);
  const placingRef    = useRef(placing);
  const coinsRef      = useRef(coins);
  const needsRedraw   = useRef(true);
  buildingsRef.current  = buildings;
  hoverCellRef.current  = hoverCell;
  placingRef.current    = placing;
  coinsRef.current      = coins;

  // ── Canvas RAF draw loop ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;

    function draw() {
      if (!needsRedraw.current) { rafId = requestAnimationFrame(draw); return; }
      needsRedraw.current = false;

      const bs    = buildingsRef.current;
      const hc    = hoverCellRef.current;
      const pl    = placingRef.current;
      const curCoins = coinsRef.current;

      // ── Background ────────────────────────────────────────────────
      const sky = ctx!.createLinearGradient(0, 0, 0, H * 0.4);
      sky.addColorStop(0, "#0ea5e9");
      sky.addColorStop(1, "#7dd3fc");
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, W, H * 0.4);

      const land = ctx!.createLinearGradient(0, H * 0.4, 0, H);
      land.addColorStop(0, "#16a34a");
      land.addColorStop(1, "#14532d");
      ctx!.fillStyle = land;
      ctx!.fillRect(0, H * 0.4, W, H * 0.6);

      // ── Grid cells ────────────────────────────────────────────────
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cx = c * SZ;
          const cy = r * SZ;
          const occupied = bs.some((b) => b.x === c && b.y === r);
          if (occupied) continue;

          const isHover = hc?.[0] === r && hc?.[1] === c;
          if (pl && isHover) {
            const def = BUILDING_DEFS[pl];
            const canAfford = def ? curCoins >= def.cost : false;
            ctx!.fillStyle = canAfford ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
            ctx!.strokeStyle = canAfford ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)";
          } else if (pl && isHover === false) {
            ctx!.fillStyle = "rgba(255,255,255,0.04)";
            ctx!.strokeStyle = "rgba(255,255,255,0.12)";
          } else {
            ctx!.fillStyle = "rgba(0,0,0,0.04)";
            ctx!.strokeStyle = "rgba(255,255,255,0.10)";
          }
          ctx!.lineWidth = 1;
          ctx!.fillRect(cx + 1, cy + 1, SZ - 2, SZ - 2);
          ctx!.strokeRect(cx + 0.5, cy + 0.5, SZ - 1, SZ - 1);
        }
      }

      // ── Buildings ─────────────────────────────────────────────────
      for (const b of bs) {
        const def = BUILDING_DEFS[b.type];
        if (!def) continue;
        const cx = b.x * SZ;
        const cy = b.y * SZ;

        // Drop shadow
        ctx!.fillStyle = "rgba(0,0,0,0.18)";
        ctx!.beginPath();
        ctx!.ellipse(cx + SZ / 2, cy + SZ - 6, 22, 6, 0, 0, Math.PI * 2);
        ctx!.fill();

        def.draw(ctx!, cx, cy, SZ, b.level);

        // Level badge (level > 1)
        if (b.level > 1) {
          ctx!.fillStyle = "#facc15";
          ctx!.beginPath();
          ctx!.arc(cx + SZ - 11, cy + 11, 10, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.fillStyle = "#1a1a1a";
          ctx!.font = "bold 9px sans-serif";
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(`${b.level}`, cx + SZ - 11, cy + 11);
        }
      }

      // ── Ghost preview ─────────────────────────────────────────────
      if (pl && hc) {
        const [hr, hcol] = hc;
        const occupied = bs.some((b) => b.x === hcol && b.y === hr);
        const def = BUILDING_DEFS[pl];
        if (def && !occupied) {
          ctx!.globalAlpha = 0.5;
          def.draw(ctx!, hcol * SZ, hr * SZ, SZ, 1);
          ctx!.globalAlpha = 1;
        }
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional — RAF loop reads from refs

  // Trigger redraw when state changes
  useEffect(() => { needsRedraw.current = true; }, [buildings, hoverCell, placing, coins]);

  // ── Cell geometry helpers ──────────────────────────────────────────
  function getCellFromEvent(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const col = Math.floor((e.clientX - rect.left) * scaleX / SZ);
    const row = Math.floor((e.clientY - rect.top)  * scaleY / SZ);
    return { col, row };
  }

  // ── Pointer handlers ───────────────────────────────────────────────
  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const { col, row } = getCellFromEvent(e);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    const occupied = buildings.find((b) => b.x === col && b.y === row);

    if (placing && !occupied) {
      const def = BUILDING_DEFS[placing];
      if (!def) return;
      if (!spend(def.cost)) {
        shakeBuilding();
        return;
      }
      placeBuilding(placing, col, row);
      // Keep placing mode so the player can place multiple buildings
    } else if (occupied) {
      const def = BUILDING_DEFS[occupied.type];
      setConfirm({
        id:    occupied.id,
        type:  occupied.type,
        level: occupied.level,
        col,
        row,
      });
      setPlacing(null);
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!placing) { setHoverCell(null); return; }
    const { col, row } = getCellFromEvent(e);
    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      setHoverCell([row, col]);
    } else {
      setHoverCell(null);
    }
  }

  // ── Available building list ────────────────────────────────────────
  const available = ALL_BUILDING_IDS.filter((id) => {
    const def = BUILDING_DEFS[id];
    return def && (xp >= def.xpRequired || unlockedBuildings.includes(id));
  });

  // ── City stats ─────────────────────────────────────────────────────
  const totalPop   = buildings.reduce((acc, b) => acc + (BUILDING_DEFS[b.type]?.population ?? 0) * b.level, 0);
  const totalCount = buildings.length;
  const upgradeCost = (b: { type: string; level: number }) => {
    const base = BUILDING_DEFS[b.type]?.cost ?? 0;
    return Math.round(base * 1.5 * b.level);
  };

  return (
    <div className="relative flex flex-col h-full bg-slate-900 select-none">

      {/* ── Stats bar ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-4 px-4 py-2 bg-black/40 border-b border-white/10 text-xs">
        <span className="text-white/60">
          🏙 <span className="text-white font-semibold">{totalCount}</span> buildings
        </span>
        <span className="text-white/60">
          👥 <span className="text-white font-semibold">{totalPop.toLocaleString()}</span> pop
        </span>
        <span className="flex-1" />
        {placing && (
          <span className="text-yellow-300 font-semibold animate-pulse">
            Tap grid to place
          </span>
        )}
      </div>

      {/* ── City canvas ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto flex items-start justify-center">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className={`block ${placing ? "cursor-crosshair" : "cursor-pointer"}`}
          style={{ maxWidth: "100%", height: "auto" }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCell(null)}
        />
      </div>

      {/* ── Building palette ───────────────────────────────────────── */}
      <div className={`flex-shrink-0 bg-black/70 backdrop-blur-sm border-t border-white/10 p-3 ${shakeBuildingId ? "animate-shake" : ""}`}>
        {available.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-3">
            Play games to earn XP and unlock buildings!
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {placing && (
              <button
                onClick={() => { setPlacing(null); setHoverCell(null); }}
                className="flex-shrink-0 flex flex-col items-center gap-1 bg-red-500/20 border border-red-500/40 rounded-xl px-3 py-2 text-red-400 text-xs font-bold"
              >
                <span className="text-lg leading-none">✕</span>
                <span>Cancel</span>
              </button>
            )}
            {available.map((id) => {
              const def = BUILDING_DEFS[id];
              if (!def) return null;
              const canAfford = coins >= def.cost;
              const isActive  = placing === id;
              return (
                <button
                  key={id}
                  onClick={() => setPlacing(isActive ? null : id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold border transition-all ${
                    isActive
                      ? "bg-yellow-400 text-yellow-900 border-yellow-300 scale-105"
                      : canAfford
                      ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                      : "bg-white/5 border-white/10 text-white/30"
                  }`}
                >
                  <span className="text-xl leading-none">{def.emoji}</span>
                  <span className="whitespace-nowrap">{def.label}</span>
                  <span className={canAfford ? "text-yellow-400" : "text-red-400"}>
                    🪙{def.cost}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Inline confirm overlay ─────────────────────────────────── */}
      {confirm && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center pb-40"
          onClick={() => setConfirm(null)}
        >
          <div
            className="bg-zinc-900 border border-white/20 rounded-2xl p-5 mx-4 w-full max-w-sm shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{BUILDING_DEFS[confirm.type]?.emoji}</span>
              <div>
                <p className="font-bold text-white">{BUILDING_DEFS[confirm.type]?.label}</p>
                <p className="text-white/50 text-xs">Level {confirm.level}</p>
              </div>
              <button
                onClick={() => setConfirm(null)}
                className="ml-auto text-white/40 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-3">
              {/* Upgrade */}
              {(() => {
                const uc = upgradeCost({ type: confirm.type, level: confirm.level });
                const canUpgrade = coins >= uc;
                return (
                  <button
                    onClick={() => {
                      if (!canUpgrade) { shakeBuilding(); return; }
                      if (!spend(uc)) { shakeBuilding(); return; }
                      upgradeBuilding(confirm.id);
                      setConfirm(null);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      canUpgrade
                        ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300"
                        : "bg-white/10 text-white/30"
                    }`}
                  >
                    ⬆ Upgrade · 🪙{upgradeCost({ type: confirm.type, level: confirm.level })}
                  </button>
                );
              })()}

              {/* Remove */}
              <button
                onClick={() => {
                  removeBuilding(confirm.id);
                  setConfirm(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
              >
                🗑 Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
