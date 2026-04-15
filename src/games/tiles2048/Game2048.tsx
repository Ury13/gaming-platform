"use client";

import { useEffect, useRef } from "react";
import { useRewardEngine } from "@/store/rewardEngine";
import { useGameScore } from "@/hooks/useGameScore";

const W = 320, H = 480;
const GRID = 4;
const GAP = 8;
const TILE_SIZE = Math.floor((W - 40 - GAP * (GRID - 1)) / GRID); // 60px
const GRID_X = (W - (TILE_SIZE * GRID + GAP * (GRID - 1))) / 2; // centered
const GRID_Y = 120;

const TILE_COLORS: Record<number, [string, string]> = {
  0:    ["rgba(255,255,255,0.05)", "transparent"],
  2:    ["#312e81", "#c7d2fe"],
  4:    ["#3730a3", "#e0e7ff"],
  8:    ["#5b21b6", "#ede9fe"],
  16:   ["#7c3aed", "#f5f3ff"],
  32:   ["#9333ea", "#faf5ff"],
  64:   ["#c026d3", "#fdf4ff"],
  128:  ["#db2777", "#fff1f2"],
  256:  ["#e11d48", "#fff1f2"],
  512:  ["#ea580c", "#fff7ed"],
  1024: ["#d97706", "#fffbeb"],
  2048: ["#facc15", "#1a1200"],
};

type Grid = number[][];

function makeGrid(): Grid {
  return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}

function addRandom(g: Grid): Grid {
  const empties: [number, number][] = [];
  g.forEach((row, r) => row.forEach((v, c) => { if (v === 0) empties.push([r, c]); }));
  if (!empties.length) return g;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const ng = g.map((row) => [...row]);
  ng[r][c] = Math.random() < 0.9 ? 2 : 4;
  return ng;
}

function shiftRow(row: number[]): { row: number[]; score: number } {
  const filtered = row.filter((v) => v !== 0);
  let score = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      merged.push(filtered[i] * 2);
      score += filtered[i] * 2;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < GRID) merged.push(0);
  return { row: merged, score };
}

type Dir = "left" | "right" | "up" | "down";

function move(g: Grid, dir: Dir): { grid: Grid; score: number; moved: boolean } {
  let grid = g.map((row) => [...row]);
  let score = 0;
  const oldStr = JSON.stringify(grid);

  const transpose = (m: Grid): Grid => m[0].map((_, c) => m.map((row) => row[c]));
  const reverseRows = (m: Grid): Grid => m.map((row) => [...row].reverse());

  if (dir === "right") grid = reverseRows(grid);
  if (dir === "up") grid = transpose(grid);
  if (dir === "down") { grid = transpose(grid); grid = reverseRows(grid); }

  grid = grid.map((row) => { const { row: r, score: s } = shiftRow(row); score += s; return r; });

  if (dir === "right") grid = reverseRows(grid);
  if (dir === "up") grid = transpose(grid);
  if (dir === "down") { grid = reverseRows(grid); grid = transpose(grid); }

  return { grid, score, moved: JSON.stringify(grid) !== oldStr };
}

function hasValidMoves(g: Grid): boolean {
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
    if (g[r][c] === 0) return true;
    if (c + 1 < GRID && g[r][c] === g[r][c + 1]) return true;
    if (r + 1 < GRID && g[r][c] === g[r + 1][c]) return true;
  }
  return false;
}

export default function Game2048() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earn = useRewardEngine((s) => s.earn);
  const { record } = useGameScore("2048");

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let rafId: number;

    const s = {
      grid: addRandom(addRandom(makeGrid())),
      score: 0,
      best: 0,
      phase: "playing" as "playing" | "over" | "won",
      didWin: false,
    };

    function tileX(c: number) { return GRID_X + c * (TILE_SIZE + GAP); }
    function tileY(r: number) { return GRID_Y + r * (TILE_SIZE + GAP); }

    function drawTile(value: number, x: number, y: number) {
      const [bg, fg] = TILE_COLORS[value] ?? ["#7f1d1d", "#fff"];
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(x, y, TILE_SIZE, TILE_SIZE, 10);
      ctx.fill();

      if (value > 0) {
        const fontSize = value >= 1000 ? 18 : value >= 100 ? 22 : value >= 10 ? 26 : 30;
        ctx.fillStyle = fg;
        ctx.font = `bold ${fontSize}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(value), x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        ctx.textBaseline = "alphabetic";
      }

      if (value === 2048) {
        ctx.save();
        ctx.shadowColor = "#facc15"; ctx.shadowBlur = 20;
        ctx.strokeStyle = "#facc15"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 9); ctx.stroke();
        ctx.restore();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#1a0f00"); bg.addColorStop(1, "#2a1800");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Title
      ctx.fillStyle = "#facc15"; ctx.font = "bold 28px system-ui"; ctx.textAlign = "center";
      ctx.fillText("2048", W / 2, 44);
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = "11px system-ui";
      ctx.fillText("CITY EDITION", W / 2, 60);

      // Score panel
      [{ label: "SCORE", value: s.score, x: W / 2 - 55 }, { label: "BEST", value: s.best, x: W / 2 + 55 }].forEach(({ label, value, x }) => {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath(); ctx.roundRect(x - 34, 70, 68, 38, 8); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px system-ui"; ctx.textAlign = "center";
        ctx.fillText(label, x, 82);
        ctx.fillStyle = "#facc15"; ctx.font = "bold 16px system-ui";
        ctx.fillText(String(value), x, 100);
      });

      // Grid background
      const gw = TILE_SIZE * GRID + GAP * (GRID - 1) + 12;
      const gh = TILE_SIZE * GRID + GAP * (GRID - 1) + 12;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath(); ctx.roundRect(GRID_X - 6, GRID_Y - 6, gw, gh, 14); ctx.fill();

      // Tiles
      for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
        drawTile(s.grid[r][c], tileX(c), tileY(r));
      }

      // Overlays
      if (s.phase === "over") {
        ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(GRID_X - 6, GRID_Y - 6, gw, gh);
        ctx.fillStyle = "#ef4444"; ctx.font = "bold 22px system-ui"; ctx.textAlign = "center";
        ctx.fillText("Game Over!", W / 2, GRID_Y + gh / 2 - 10);
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "12px system-ui";
        ctx.fillText("Tap to restart", W / 2, GRID_Y + gh / 2 + 16);
      }
      if (s.phase === "won") {
        ctx.fillStyle = "rgba(250,204,21,0.18)"; ctx.fillRect(GRID_X - 6, GRID_Y - 6, gw, gh);
        ctx.fillStyle = "#facc15"; ctx.font = "bold 22px system-ui"; ctx.textAlign = "center";
        ctx.fillText("You reached 2048!", W / 2, GRID_Y + gh / 2 - 10);
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "12px system-ui";
        ctx.fillText("Keep going or tap to restart", W / 2, GRID_Y + gh / 2 + 16);
      }
    }

    function doMove(dir: Dir) {
      if (s.phase === "over") { Object.assign(s, { grid: addRandom(addRandom(makeGrid())), score: 0, phase: "playing", didWin: false }); return; }
      const { grid, score, moved } = move(s.grid, dir);
      if (!moved) return;
      s.grid = addRandom(grid);
      s.score += score;
      s.best = Math.max(s.best, s.score);
      record(s.score);
      if (score > 0) earn({ coins: Math.floor(score / 8), xp: Math.floor(score / 20) });
      const maxTile = s.grid.flat().reduce((a, b) => Math.max(a, b), 0);
      if (maxTile >= 2048 && !s.didWin) { s.didWin = true; s.phase = "won"; earn({ coins: 200, xp: 100, buildingId: "tower", message: "🏆 2048 reached!" }); }
      else if (!hasValidMoves(s.grid)) { s.phase = "over"; earn({ coins: Math.floor(s.score / 20), xp: Math.floor(s.score / 50) }); }
    }

    function render() { draw(); rafId = requestAnimationFrame(render); }
    rafId = requestAnimationFrame(render);

    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      if (map[e.code]) { e.preventDefault(); doMove(map[e.code]); }
    };

    let tx = 0, ty = 0;
    const onTouchStart = (e: TouchEvent) => { e.stopPropagation(); tx = e.touches[0].clientX; ty = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      e.stopPropagation();
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) < 15 && Math.abs(dy) < 15) { if (s.phase !== "playing") { Object.assign(s, { grid: addRandom(addRandom(makeGrid())), score: 0, phase: "playing", didWin: false }); } return; }
      if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? "right" : "left");
      else doMove(dy > 0 ? "down" : "up");
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [earn, record]);

  return (
    <div className="flex items-center justify-center h-full bg-[#1a0f00]">
      <canvas ref={canvasRef} width={W} height={H} className="rounded-2xl shadow-2xl touch-none" />
    </div>
  );
}
