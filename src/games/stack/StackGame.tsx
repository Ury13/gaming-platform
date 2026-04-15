"use client";

import { useEffect, useRef } from "react";
import { useRewardEngine } from "@/store/rewardEngine";
import { useGameScore } from "@/hooks/useGameScore";

const W = 320, H = 500;
const BLOCK_H = 26;
const INIT_W = 190;
const BASE_SPEED = 1.8;
const PERFECT_THRESHOLD = 5;
const MOVING_Y = 72; // screen y of moving block

type Block = { x: number; width: number; hue: number; dir?: number };
type CutPiece = { x: number; y: number; w: number; hue: number; vy: number; vx: number };

export default function StackGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earn = useRewardEngine((s) => s.earn);
  const { record } = useGameScore("stack");

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let rafId: number;

    const s = {
      stack: [{ x: (W - INIT_W) / 2, width: INIT_W, hue: 210 }] as Block[],
      moving: { x: -INIT_W, width: INIT_W, dir: 1 as 1 | -1 },
      cuts: [] as CutPiece[],
      speed: BASE_SPEED,
      score: 0,
      phase: "idle" as "idle" | "playing" | "over",
      combo: 0,
    };

    function spawnMoving() {
      const top = s.stack[s.stack.length - 1];
      s.moving = { x: top.dir === 1 ? -top.width : W, width: top.width, dir: top.dir as 1 | -1 };
    }

    // @ts-ignore - extend block with direction tracking
    s.stack[0].dir = 1;

    function drop() {
      if (s.phase === "over") {
        Object.assign(s, {
          stack: [{ x: (W - INIT_W) / 2, width: INIT_W, hue: 210, dir: 1 }],
          moving: { x: -INIT_W, width: INIT_W, dir: 1 },
          cuts: [], speed: BASE_SPEED, score: 0, phase: "playing", combo: 0,
        });
        spawnMoving();
        return;
      }
      if (s.phase === "idle") { s.phase = "playing"; spawnMoving(); return; }

      const top = s.stack[s.stack.length - 1];
      const mv = s.moving;
      const overlapStart = Math.max(top.x, mv.x);
      const overlapEnd = Math.min(top.x + top.width, mv.x + mv.width);
      const overlap = overlapEnd - overlapStart;

      if (overlap <= 2) { s.phase = "over"; record(s.score); earn({ coins: s.score * 3, xp: s.score, message: `${s.score} stacks!` }); return; }

      const perfect = Math.abs(mv.x - top.x) < PERFECT_THRESHOLD;
      const newX = perfect ? top.x : overlapStart;
      const newW = perfect ? top.width : overlap;
      const newHue = (top.hue + 22) % 360;

      if (!perfect) {
        const cutX = mv.x < top.x ? mv.x : overlapEnd;
        const dropY = MOVING_Y + BLOCK_H;
        s.cuts.push({ x: cutX, y: dropY, w: Math.abs(mv.width - overlap), hue: newHue, vy: -1, vx: mv.dir * 1.5 });
        s.combo = 0;
      } else {
        s.combo++;
      }

      s.stack.push({ x: newX, width: newW, hue: newHue } as Block & { dir: number });
      // @ts-ignore
      s.stack[s.stack.length - 1].dir = -mv.dir;
      s.score++;
      record(s.score);
      s.speed = BASE_SPEED + Math.min(s.score * 0.06, 3.5);
      earn({ coins: perfect ? 20 : 8, xp: 3, message: perfect ? (s.combo > 1 ? `⭐ ${s.combo}× Combo!` : "⭐ Perfect!") : undefined });
      spawnMoving();
    }

    function drawBlock(x: number, y: number, w: number, h: number, hue: number, alpha = 1) {
      if (w < 1) return;
      ctx.globalAlpha = alpha;
      // Main face
      ctx.fillStyle = `hsl(${hue},65%,52%)`;
      ctx.fillRect(x, y, w, h);
      // Top shine
      ctx.fillStyle = `hsl(${hue},65%,70%)`;
      ctx.fillRect(x, y, w, 5);
      // Right dark edge
      ctx.fillStyle = `hsl(${hue},65%,35%)`;
      ctx.fillRect(x + w - 4, y + 5, 4, h - 5);
      // Bottom dark
      ctx.fillStyle = `hsl(${hue},65%,30%)`;
      ctx.fillRect(x, y + h - 3, w - 4, 3);
      ctx.globalAlpha = 1;
    }

    function loop() {
      ctx.clearRect(0, 0, W, H);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0a0820");
      bg.addColorStop(1, "#15103a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Stack — index 0 = bottom/oldest, last = newest/top
      const stackLen = s.stack.length;
      for (let i = 0; i < stackLen; i++) {
        const b = s.stack[i] as Block;
        // newest block (i = stackLen-1) → screenY = MOVING_Y + BLOCK_H
        const screenY = MOVING_Y + BLOCK_H + (stackLen - 1 - i) * BLOCK_H;
        if (screenY > H + BLOCK_H) continue;
        const fade = Math.max(0.25, 1 - (stackLen - 1 - i) * 0.06);
        drawBlock(b.x, screenY, b.width, BLOCK_H, b.hue, fade);
      }

      // Moving block
      if (s.phase === "playing") {
        const hue = ((s.stack[s.stack.length - 1] as Block).hue + 22) % 360;
        drawBlock(s.moving.x, MOVING_Y, s.moving.width, BLOCK_H, hue);

        // Alignment guide (subtle line)
        const top = s.stack[s.stack.length - 1] as Block;
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(top.x, MOVING_Y - 4);
        ctx.lineTo(top.x, MOVING_Y + BLOCK_H * 4);
        ctx.moveTo(top.x + top.width, MOVING_Y - 4);
        ctx.lineTo(top.x + top.width, MOVING_Y + BLOCK_H * 4);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Cut pieces
      for (const cp of s.cuts) {
        drawBlock(cp.x, cp.y, cp.w, BLOCK_H, cp.hue, 0.7);
      }

      // Score
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 40, 14, 80, 36, 18);
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 20px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${s.score}`, W / 2, 37);

      if (s.phase === "idle") {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Tap to Play", W / 2, H / 2 - 10);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "13px system-ui";
        ctx.fillText("Drop the block to stack it", W / 2, H / 2 + 18);
      }

      if (s.phase === "over") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.font = "bold 26px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("Collapsed!", W / 2, H / 2 - 24);
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 36px system-ui";
        ctx.fillText(`${s.score}`, W / 2, H / 2 + 14);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "13px system-ui";
        ctx.fillText("blocks stacked · Tap to retry", W / 2, H / 2 + 42);
      }

      // Physics update
      if (s.phase === "playing") {
        s.moving.x += s.speed * s.moving.dir;
        if (s.moving.x + s.moving.width > W + 10) s.moving.dir = -1;
        if (s.moving.x < -10) s.moving.dir = 1;
      }
      s.cuts = s.cuts
        .map((cp) => ({ ...cp, vy: cp.vy + 0.45, y: cp.y + cp.vy, x: cp.x + cp.vx }))
        .filter((cp) => cp.y < H + 60);

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    canvas.addEventListener("click", drop);
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); drop(); } };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(rafId); canvas.removeEventListener("click", drop); window.removeEventListener("keydown", onKey); };
  }, [earn, record]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0a0820]">
      <canvas ref={canvasRef} width={W} height={H} className="rounded-2xl shadow-2xl cursor-pointer touch-none" />
    </div>
  );
}
