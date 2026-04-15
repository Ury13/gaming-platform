"use client";

import { useEffect, useRef } from "react";
import { useRewardEngine } from "@/store/rewardEngine";
import { useGameScore } from "@/hooks/useGameScore";

const COLS = 18, ROWS = 22, CELL = 17;
const W = COLS * CELL, H = ROWS * CELL;
const STEP_INTERVAL_INIT = 9; // frames between moves
const STEP_INTERVAL_MIN = 4;

type Pos = { x: number; y: number };

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earn = useRewardEngine((s) => s.earn);
  const { record } = useGameScore("snake");

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let rafId: number;

    const mkFood = (snake: Pos[]): Pos => {
      let f: Pos;
      do { f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
      while (snake.some((s) => s.x === f.x && s.y === f.y));
      return f;
    };

    const s = {
      snake: [{ x: 9, y: 11 }, { x: 8, y: 11 }, { x: 7, y: 11 }] as Pos[],
      dir: { x: 1, y: 0 } as Pos,
      nextDir: { x: 1, y: 0 } as Pos,
      food: { x: 14, y: 8 } as Pos,
      score: 0,
      frame: 0,
      stepInterval: STEP_INTERVAL_INIT,
      alive: true,
      started: false,
      lastReward: 0,
      pulseT: 0, // food pulse animation
    };

    function restart() {
      s.snake = [{ x: 9, y: 11 }, { x: 8, y: 11 }, { x: 7, y: 11 }];
      s.dir = { x: 1, y: 0 }; s.nextDir = { x: 1, y: 0 };
      s.food = mkFood(s.snake); s.score = 0; s.frame = 0;
      s.stepInterval = STEP_INTERVAL_INIT; s.alive = true; s.started = true; s.lastReward = 0;
    }

    function step() {
      s.dir = s.nextDir;
      const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

      // Wall collision
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) { s.alive = false; return; }
      // Self collision
      if (s.snake.some((seg) => seg.x === head.x && seg.y === head.y)) { s.alive = false; return; }

      s.snake.unshift(head);

      if (head.x === s.food.x && head.y === s.food.y) {
        s.score += 10;
        record(s.score);
        s.food = mkFood(s.snake);
        s.stepInterval = Math.max(STEP_INTERVAL_MIN, s.stepInterval - 0.4);
        earn({ coins: 12, xp: 4 });
      } else {
        s.snake.pop();
      }

      if (s.score - s.lastReward >= 50) { earn({ coins: 20, xp: 8 }); s.lastReward = s.score; }
    }

    function drawGlow(x: number, y: number, r: number, color: string, blur: number) {
      ctx.save();
      ctx.shadowColor = color; ctx.shadowBlur = blur;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function loop() {
      ctx.clearRect(0, 0, W, H);

      // Background + grid
      ctx.fillStyle = "#030c03";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(0,255,80,0.04)";
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke(); }
      for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke(); }

      // Snake
      for (let i = 0; i < s.snake.length; i++) {
        const seg = s.snake[i];
        const isHead = i === 0;
        const fade = Math.max(0.25, 1 - i / s.snake.length);
        const px = seg.x * CELL + CELL / 2;
        const py = seg.y * CELL + CELL / 2;
        const r = isHead ? CELL * 0.45 : CELL * 0.38;

        if (isHead) {
          ctx.save();
          ctx.shadowColor = "#00ff80"; ctx.shadowBlur = 20;
          ctx.fillStyle = "#00ff80";
          ctx.beginPath(); ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
          ctx.fill();
          ctx.restore();
          // Eyes
          const eyeOffset = s.dir.x !== 0 ? { a: { x: 0, y: -3 }, b: { x: 0, y: 3 } } : { a: { x: -3, y: 0 }, b: { x: 3, y: 0 } };
          ctx.fillStyle = "#001a00";
          ctx.beginPath(); ctx.arc(px + s.dir.x * 3 + eyeOffset.a.x, py + s.dir.y * 3 + eyeOffset.a.y, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(px + s.dir.x * 3 + eyeOffset.b.x, py + s.dir.y * 3 + eyeOffset.b.y, 2, 0, Math.PI * 2); ctx.fill();
        } else {
          const green = Math.round(200 * fade + 55);
          ctx.save();
          ctx.shadowColor = `rgba(0,${green},0,${fade})`;
          ctx.shadowBlur = 8 * fade;
          ctx.fillStyle = `rgba(0,${green},40,${fade})`;
          ctx.beginPath();
          ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 3);
          ctx.fill();
          ctx.restore();
        }
        void px; void py; void r;
      }

      // Food (pulsing)
      s.pulseT = (s.pulseT + 0.08) % (Math.PI * 2);
      const pulse = 1 + Math.sin(s.pulseT) * 0.15;
      const fx = s.food.x * CELL + CELL / 2;
      const fy = s.food.y * CELL + CELL / 2;
      ctx.save();
      ctx.shadowColor = "#ff3333"; ctx.shadowBlur = 20 * pulse;
      for (let r = 3; r >= 1; r--) {
        ctx.globalAlpha = 0.15 * r;
        ctx.fillStyle = "#ff3333";
        ctx.beginPath(); ctx.arc(fx, fy, CELL * 0.42 * pulse * (1 + (3 - r) * 0.2), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ff5555";
      ctx.beginPath(); ctx.arc(fx, fy, CELL * 0.38 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.arc(fx - 2, fy - 2, CELL * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Score bar
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, 28);
      ctx.fillStyle = "#00ff80"; ctx.font = "bold 14px monospace"; ctx.textAlign = "left";
      ctx.fillText(`Score: ${s.score}`, 8, 19);
      ctx.fillStyle = "rgba(0,255,80,0.4)"; ctx.textAlign = "right";
      ctx.fillText(`Lv.${Math.floor(s.score / 50) + 1}`, W - 8, 19);

      if (!s.started) {
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#00ff80"; ctx.font = "bold 20px system-ui"; ctx.textAlign = "center";
        ctx.fillText("Neon Snake", W / 2, H / 2 - 20);
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "12px system-ui";
        ctx.fillText("Arrow keys or swipe to move", W / 2, H / 2 + 10);
      }

      if (!s.alive && s.started) {
        ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ff3333"; ctx.font = "bold 24px system-ui"; ctx.textAlign = "center";
        ctx.fillText("Game Over", W / 2, H / 2 - 26);
        ctx.fillStyle = "#00ff80"; ctx.font = "bold 32px monospace"; ctx.fillText(`${s.score}`, W / 2, H / 2 + 12);
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "12px system-ui";
        ctx.fillText("Tap or Space to restart", W / 2, H / 2 + 42);
      }

      if (s.started && s.alive) {
        s.frame++;
        if (s.frame % Math.round(s.stepInterval) === 0) step();
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    const setDir = (dx: number, dy: number) => {
      if (!s.alive) { restart(); return; }
      if (!s.started) s.started = true;
      if (dx === -s.dir.x && dy === -s.dir.y) return; // no reversal
      s.nextDir = { x: dx, y: dy };
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp") { e.preventDefault(); setDir(0, -1); }
      if (e.code === "ArrowDown") { e.preventDefault(); setDir(0, 1); }
      if (e.code === "ArrowLeft") { e.preventDefault(); setDir(-1, 0); }
      if (e.code === "ArrowRight") { e.preventDefault(); setDir(1, 0); }
      if (e.code === "Space") { e.preventDefault(); if (!s.alive) restart(); else if (!s.started) s.started = true; }
    };

    let touchX = 0, touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      e.stopPropagation();
      touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.stopPropagation();
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { if (!s.alive) restart(); return; }
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
      else setDir(0, dy > 0 ? 1 : -1);
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("click", () => { if (!s.alive) restart(); else if (!s.started) s.started = true; });
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [earn, record]);

  return (
    <div className="flex items-center justify-center h-full bg-[#030c03]">
      <canvas ref={canvasRef} width={W} height={H} className="rounded-2xl shadow-2xl touch-none" />
    </div>
  );
}
