"use client";

import { useEffect, useRef } from "react";
import { useRewardEngine } from "@/store/rewardEngine";
import { useGameScore } from "@/hooks/useGameScore";

const COLS = 6;
const ROWS = 8;
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"];
const GEM_SIZE = 48;
const MATCH_MIN = 3;

type Gem = { color: number; id: number };

let gemIdCounter = 0;
function newGem(): Gem {
  return { color: Math.floor(Math.random() * COLORS.length), id: gemIdCounter++ };
}

function makeBoard(): Gem[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => newGem())
  );
}

function findMatches(board: Gem[][]): Set<string> {
  const matched = new Set<string>();

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let streak = 1;
    for (let c = 1; c < COLS; c++) {
      if (board[r][c].color === board[r][c - 1].color) {
        streak++;
      } else {
        if (streak >= MATCH_MIN) {
          for (let k = c - streak; k < c; k++) matched.add(`${r},${k}`);
        }
        streak = 1;
      }
    }
    if (streak >= MATCH_MIN) {
      for (let k = COLS - streak; k < COLS; k++) matched.add(`${r},${k}`);
    }
  }

  // Vertical
  for (let c = 0; c < COLS; c++) {
    let streak = 1;
    for (let r = 1; r < ROWS; r++) {
      if (board[r][c].color === board[r - 1][c].color) {
        streak++;
      } else {
        if (streak >= MATCH_MIN) {
          for (let k = r - streak; k < r; k++) matched.add(`${k},${c}`);
        }
        streak = 1;
      }
    }
    if (streak >= MATCH_MIN) {
      for (let k = ROWS - streak; k < ROWS; k++) matched.add(`${k},${c}`);
    }
  }

  return matched;
}

function applyGravity(board: Gem[][]): Gem[][] {
  return board.map((row) => row.slice()).map((_, c) => {
    const col = board.map((row) => row[c]).filter(Boolean);
    while (col.length < ROWS) col.unshift(newGem());
    return col;
  }).reduce((acc, col, c) => {
    col.forEach((gem, r) => { acc[r][c] = gem; });
    return acc;
  }, makeBoard());
}

export default function Match3Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<Gem[][]>(makeBoard());
  const selectedRef = useRef<[number, number] | null>(null);
  const earn = useRewardEngine((s) => s.earn);
  const { record } = useGameScore("match3");
  const animRef = useRef<number>(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      const board = boardRef.current;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      // Background
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const gem = board[r][c];
          const x = c * GEM_SIZE + 4;
          const y = r * GEM_SIZE + 4;
          const size = GEM_SIZE - 8;

          const isSelected =
            selectedRef.current?.[0] === r && selectedRef.current?.[1] === c;

          // Gem body
          ctx.fillStyle = COLORS[gem.color];
          ctx.beginPath();
          ctx.roundRect(x, y, size, size, 8);
          ctx.fill();

          // Shine
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.beginPath();
          ctx.roundRect(x + 4, y + 4, size / 2, size / 3, 4);
          ctx.fill();

          // Selection ring
          if (isSelected) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(x - 2, y - 2, size + 4, size + 4, 10);
            ctx.stroke();
          }
        }
      }

      // Score
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, ROWS * GEM_SIZE, canvas!.width, 40);
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Score: ${scoreRef.current}`, canvas!.width / 2, ROWS * GEM_SIZE + 26);
    }

    function resolveBoard() {
      let board = boardRef.current;
      let totalMatched = 0;

      while (true) {
        const matched = findMatches(board);
        if (matched.size === 0) break;
        totalMatched += matched.size;

        // Remove matched
        for (const key of matched) {
          const [r, c] = key.split(",").map(Number);
          board[r][c] = null as unknown as Gem;
        }

        // Gravity
        for (let c = 0; c < COLS; c++) {
          const col = board.map((row) => row[c]).filter(Boolean);
          while (col.length < ROWS) col.unshift(newGem());
          col.forEach((gem, r) => { board[r][c] = gem; });
        }
      }

      if (totalMatched > 0) {
        const coins = totalMatched * 5;
        const xp = totalMatched * 2;
        scoreRef.current += coins;
        record(scoreRef.current);
        earn({ coins, xp, message: `${totalMatched} match!` });
      }

      boardRef.current = board;
      draw();
    }

    function handleClick(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const c = Math.floor(x / GEM_SIZE);
      const r = Math.floor(y / GEM_SIZE);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

      if (!selectedRef.current) {
        selectedRef.current = [r, c];
        draw();
        return;
      }

      const [sr, sc] = selectedRef.current;
      const dr = Math.abs(r - sr);
      const dc = Math.abs(c - sc);

      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        // Swap
        const board = boardRef.current;
        [board[sr][sc], board[r][c]] = [board[r][c], board[sr][sc]];
        selectedRef.current = null;
        resolveBoard();
      } else {
        selectedRef.current = [r, c];
        draw();
      }
    }

    canvas.addEventListener("click", handleClick);
    draw();

    return () => {
      canvas.removeEventListener("click", handleClick);
      cancelAnimationFrame(animRef.current);
    };
  }, [earn, record]);

  return (
    <div className="flex items-center justify-center h-full bg-[#1a1a2e]">
      <canvas
        ref={canvasRef}
        width={COLS * GEM_SIZE}
        height={ROWS * GEM_SIZE + 40}
        className="rounded-2xl shadow-2xl"
      />
    </div>
  );
}
