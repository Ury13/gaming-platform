"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRewardEngine } from "@/store/rewardEngine";
import { useGameScore } from "@/hooks/useGameScore";

const W = 360;
const H = 480;
const GROUND = H - 60;
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const OBSTACLE_SPEED_INIT = 4;
const OBSTACLE_INTERVAL = 90; // frames

type Obstacle = { x: number; w: number; h: number };

export default function RunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earn = useRewardEngine((s) => s.earn);
  const { record } = useGameScore("runner");

  const stateRef = useRef({
    y: GROUND - 40,
    vy: 0,
    onGround: true,
    obstacles: [] as Obstacle[],
    frame: 0,
    score: 0,
    speed: OBSTACLE_SPEED_INIT,
    alive: true,
    started: false,
    lastReward: 0,
  });

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (!s.started) { s.started = true; }
    if (s.onGround) {
      s.vy = JUMP_FORCE;
      s.onGround = false;
    }
    if (!s.alive) {
      // Restart
      stateRef.current = {
        y: GROUND - 40,
        vy: 0,
        onGround: true,
        obstacles: [],
        frame: 0,
        score: 0,
        speed: OBSTACLE_SPEED_INIT,
        alive: true,
        started: true,
        lastReward: 0,
      };
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let rafId: number;

    function drawCloud(x: number, y: number, r: number) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.8, y - r * 0.3, r * 0.7, 0, Math.PI * 2);
      ctx.arc(x + r * 1.6, y, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    function loop() {
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);

      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(1, "#1e3a5f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Clouds (parallax)
      drawCloud(((s.frame * 0.5) % (W + 120)) - 60, 80, 30);
      drawCloud(((s.frame * 0.3 + 200) % (W + 120)) - 60, 120, 20);

      // Ground
      ctx.fillStyle = "#374151";
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = "#4b5563";
      ctx.fillRect(0, GROUND, W, 4);

      if (s.started && s.alive) {
        s.frame++;
        s.score++;
        s.speed = OBSTACLE_SPEED_INIT + s.score / 600;

        // Physics
        s.vy += GRAVITY;
        s.y += s.vy;
        if (s.y >= GROUND - 40) {
          s.y = GROUND - 40;
          s.vy = 0;
          s.onGround = true;
        }

        // Spawn obstacles
        if (s.frame % OBSTACLE_INTERVAL === 0) {
          const h = 30 + Math.random() * 40;
          s.obstacles.push({ x: W + 10, w: 24, h });
        }

        // Move & cull obstacles
        s.obstacles = s.obstacles
          .map((o) => ({ ...o, x: o.x - s.speed }))
          .filter((o) => o.x > -50);

        // Collision
        for (const o of s.obstacles) {
          const ox = o.x, oy = GROUND - o.h;
          if (30 < ox + o.w && 30 + 36 > ox && s.y + 10 < oy + o.h && s.y + 40 > oy) {
            s.alive = false;
            record(s.score);
            const coins = Math.floor(s.score / 20);
            const xp = Math.floor(s.score / 50);
            earn({ coins, xp, message: `Run ended — ${s.score}m` });
          }
        }

        // Periodic reward for survival
        if (s.score - s.lastReward >= 300) {
          earn({ coins: 15, xp: 5 });
          s.lastReward = s.score;
        }
      }

      // Draw player (cute character)
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.roundRect(14, s.y, 36, 40, 8);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(26, s.y + 12, 5, 0, Math.PI * 2);
      ctx.arc(38, s.y + 12, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1e40af";
      ctx.beginPath();
      ctx.arc(28, s.y + 13, 2.5, 0, Math.PI * 2);
      ctx.arc(40, s.y + 13, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw obstacles
      for (const o of s.obstacles) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.roundRect(o.x, GROUND - o.h, o.w, o.h, [4, 4, 0, 0]);
        ctx.fill();
        // Cactus spikes
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(o.x + 7, GROUND - o.h - 10, 10, 10);
      }

      // Score
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${s.score}m`, 12, 30);

      // Prompt
      if (!s.started) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(W / 2 - 110, H / 2 - 28, 220, 56);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Tap / Space to start", W / 2, H / 2 + 8);
      }

      if (!s.alive) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Game Over!", W / 2, H / 2 - 20);
        ctx.fillStyle = "#fff";
        ctx.font = "16px sans-serif";
        ctx.fillText(`${s.score}m — Tap to restart`, W / 2, H / 2 + 16);
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };

    canvas.addEventListener("click", jump);
    window.addEventListener("keydown", handleKey);

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("click", jump);
      window.removeEventListener("keydown", handleKey);
    };
  }, [earn, jump, record]);

  return (
    <div className="flex items-center justify-center h-full bg-[#0f172a]">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-2xl shadow-2xl cursor-pointer"
      />
    </div>
  );
}
