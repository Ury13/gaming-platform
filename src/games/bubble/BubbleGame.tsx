"use client";

import { useEffect, useRef } from "react";
import { useRewardEngine } from "@/store/rewardEngine";
import { useGameScore } from "@/hooks/useGameScore";

const COLS = 8, ROWS = 10;
const R = 15; // bubble radius
const STRIDE = R * 2 + 4; // 34px
const W = 320, H = 500;
const GRID_X = (W - COLS * STRIDE) / 2; // left margin
const GRID_Y = 28;

const COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7",
];
const GLOWS = [
  "#ff8888", "#88aaff", "#88ff88", "#ffcc44", "#cc88ff",
];

type Cell = number; // 0 = empty, 1-5 = color index+1
type Grid = Cell[][];
type PopAnim = { cx: number; cy: number; color: string; t: number };

function makeGrid(): Grid {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, () => (r < 6 ? Math.ceil(Math.random() * COLORS.length) : 0))
  );
}

function cellCenter(row: number, col: number) {
  return { cx: GRID_X + col * STRIDE + R, cy: GRID_Y + row * STRIDE + R };
}

function getGroup(grid: Grid, row: number, col: number): [number, number][] {
  const color = grid[row][col];
  if (!color) return [];
  const visited = new Set<string>();
  const queue: [number, number][] = [[row, col]];
  while (queue.length) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (grid[r][c] !== color) continue;
    visited.add(key);
    queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return [...visited].map((k) => k.split(",").map(Number) as [number, number]);
}

function applyGravity(grid: Grid): Grid {
  const g = grid.map((row) => [...row]);
  for (let c = 0; c < COLS; c++) {
    const col = g.map((row) => row[c]).filter((v) => v !== 0);
    while (col.length < ROWS) col.unshift(0);
    col.forEach((v, r) => { g[r][c] = v; });
  }
  return g;
}

function hasValidMove(grid: Grid): boolean {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!grid[r][c]) continue;
    if (getGroup(grid, r, c).length >= 2) return true;
  }
  return false;
}

export default function BubbleGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earn = useRewardEngine((s) => s.earn);
  const { record } = useGameScore("bubble");

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let rafId: number;

    const s = {
      grid: makeGrid() as Grid,
      score: 0,
      phase: "playing" as "playing" | "over",
      pops: [] as PopAnim[],
      hover: null as [number, number] | null,
      hoverGroup: [] as [number, number][],
      newRowTimer: 0,
      newRowInterval: 5, // burst actions before new row
      burstCount: 0,
    };

    function burst(row: number, col: number) {
      const group = getGroup(s.grid, row, col);
      if (group.length < 2) return;

      const colorIdx = s.grid[row][col] - 1;
      const pts = group.length * group.length * 10;
      s.score += pts;
      record(s.score);
      earn({ coins: Math.floor(pts / 8), xp: group.length * 2 });

      // Pop animations
      group.forEach(([r, c]) => {
        const { cx, cy } = cellCenter(r, c);
        s.pops.push({ cx, cy, color: COLORS[colorIdx], t: 0 });
        s.grid[r][c] = 0;
      });

      s.grid = applyGravity(s.grid);

      s.burstCount++;
      if (s.burstCount % s.newRowInterval === 0) {
        // Add a new row at top
        const newRow = Array.from({ length: COLS }, () => Math.ceil(Math.random() * COLORS.length));
        const shifted = [newRow, ...s.grid.slice(0, ROWS - 1)];
        s.grid = shifted;
      }

      if (!hasValidMove(s.grid)) {
        s.phase = "over";
        earn({ coins: Math.floor(s.score / 5), xp: Math.floor(s.score / 10), message: "Board cleared!" });
      }
    }

    function drawBubble(cx: number, cy: number, color: string, glow: string, r: number, alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = glow; ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      // Shine
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function loop() {
      ctx.clearRect(0, 0, W, H);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#001a1a"); bg.addColorStop(1, "#002828");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Grid cells
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const v = s.grid[r][c];
        const { cx, cy } = cellCenter(r, c);
        const isHovered = s.hoverGroup.some(([hr, hc]) => hr === r && hc === c);

        if (v === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.03)";
          ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
        } else {
          const ci = v - 1;
          const scale = isHovered ? 1.12 : 1;
          drawBubble(cx, cy, COLORS[ci], GLOWS[ci], R * scale, isHovered ? 1 : 0.9);
          if (isHovered) {
            ctx.save();
            ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Pop animations
      s.pops = s.pops.filter((p) => p.t < 1);
      for (const p of s.pops) {
        p.t += 0.08;
        const alpha = 1 - p.t;
        const r = R * (1 + p.t * 1.5);
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.shadowColor = p.color; ctx.shadowBlur = 20 * (1 - p.t);
        ctx.strokeStyle = p.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.cx, p.cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // Score bar
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, 26);
      ctx.fillStyle = "#22d3ee"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "left";
      ctx.fillText(`Score: ${s.score}`, 8, 18);
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.textAlign = "right";
      ctx.fillText(`Match 2+ bubbles`, W - 8, 18);

      // Hover group size hint
      if (s.hoverGroup.length >= 2 && s.phase === "playing") {
        ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "center";
        ctx.fillText(`${s.hoverGroup.length} × 🫧 → +${s.hoverGroup.length * s.hoverGroup.length * 10}`, W / 2, H - 14);
      }

      if (s.phase === "over") {
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#22d3ee"; ctx.font = "bold 22px system-ui"; ctx.textAlign = "center";
        ctx.fillText("No more moves!", W / 2, H / 2 - 20);
        ctx.fillStyle = "#facc15"; ctx.font = "bold 30px system-ui";
        ctx.fillText(`${s.score}`, W / 2, H / 2 + 16);
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "12px system-ui";
        ctx.fillText("Tap to play again", W / 2, H / 2 + 44);
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    function getCell(e: MouseEvent | Touch): [number, number] | null {
      const rect = canvas.getBoundingClientRect();
      const clientX = "clientX" in e ? e.clientX : (e as Touch).clientX;
      const clientY = "clientX" in e ? e.clientY : (e as Touch).clientY;
      const x = (clientX - rect.left) * (W / rect.width);
      const y = (clientY - rect.top) * (H / rect.height);
      const c = Math.floor((x - GRID_X) / STRIDE);
      const r = Math.floor((y - GRID_Y) / STRIDE);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      const { cx, cy } = cellCenter(r, c);
      if (Math.hypot(x - cx, y - cy) > R * 1.2) return null;
      return [r, c];
    }

    canvas.addEventListener("mousemove", (e) => {
      const cell = getCell(e);
      if (!cell) { s.hover = null; s.hoverGroup = []; return; }
      if (s.hover?.[0] === cell[0] && s.hover?.[1] === cell[1]) return;
      s.hover = cell;
      const g = getGroup(s.grid, cell[0], cell[1]);
      s.hoverGroup = g.length >= 2 ? g : [];
    });

    canvas.addEventListener("click", (e) => {
      if (s.phase === "over") {
        Object.assign(s, { grid: makeGrid(), score: 0, phase: "playing", pops: [], hoverGroup: [], burstCount: 0 });
        return;
      }
      const cell = getCell(e);
      if (cell) burst(cell[0], cell[1]);
    });

    return () => { cancelAnimationFrame(rafId); };
  }, [earn, record]);

  return (
    <div className="flex items-center justify-center h-full bg-[#001a1a]">
      <canvas ref={canvasRef} width={W} height={H} className="rounded-2xl shadow-2xl cursor-pointer" />
    </div>
  );
}
