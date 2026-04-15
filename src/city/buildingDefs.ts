// Canvas draw functions for every building type.
// draw(ctx, x, y, sz, level) — paints a building inside an sz×sz cell at (x, y).

export type BuildingDef = {
  id: string;
  label: string;
  emoji: string;      // used in the palette buttons
  color: string;      // dominant colour (used for ghost preview)
  cost: number;
  xpRequired: number;
  population: number; // city population contribution
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, level: number): void;
};

// Small helper — filled rounded-rect path (no stroke)
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export const BUILDING_DEFS: Record<string, BuildingDef> = {

  // ── House ──────────────────────────────────────────────────────────────
  house: {
    id: "house", label: "House", emoji: "🏠", color: "#3b82f6",
    cost: 50, xpRequired: 0, population: 4,
    draw(ctx, x, y, sz, lvl) {
      const mx = x + sz / 2;
      // Wall
      ctx.fillStyle = lvl > 2 ? "#93c5fd" : "#60a5fa";
      ctx.fillRect(x + sz * 0.15, y + sz * 0.40, sz * 0.70, sz * 0.52);
      // Roof
      ctx.fillStyle = lvl > 1 ? "#7c3aed" : "#1d4ed8";
      ctx.beginPath();
      ctx.moveTo(x + sz * 0.08, y + sz * 0.42);
      ctx.lineTo(mx,             y + sz * 0.10);
      ctx.lineTo(x + sz * 0.92, y + sz * 0.42);
      ctx.closePath();
      ctx.fill();
      // Door
      ctx.fillStyle = "#1e3a8a";
      rr(ctx, mx - sz * 0.09, y + sz * 0.68, sz * 0.18, sz * 0.24, 2);
      ctx.fill();
      // Windows
      ctx.fillStyle = "#bfdbfe";
      ctx.fillRect(x + sz * 0.22, y + sz * 0.50, sz * 0.16, sz * 0.13);
      ctx.fillRect(x + sz * 0.62, y + sz * 0.50, sz * 0.16, sz * 0.13);
    },
  },

  // ── Bakery ─────────────────────────────────────────────────────────────
  bakery: {
    id: "bakery", label: "Bakery", emoji: "🍞", color: "#f59e0b",
    cost: 120, xpRequired: 50, population: 6,
    draw(ctx, x, y, sz) {
      // Body
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(x + sz * 0.10, y + sz * 0.38, sz * 0.80, sz * 0.54);
      // Awning
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(x + sz * 0.05, y + sz * 0.38, sz * 0.90, sz * 0.10);
      // Awning stripes
      ctx.fillStyle = "#b45309";
      for (let i = 0; i < 4; i++)
        ctx.fillRect(x + sz * (0.12 + i * 0.20), y + sz * 0.38, sz * 0.07, sz * 0.10);
      // Chimney
      ctx.fillStyle = "#92400e";
      ctx.fillRect(x + sz * 0.68, y + sz * 0.18, sz * 0.12, sz * 0.22);
      // Smoke
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(x + sz * 0.74, y + sz * 0.14, sz * 0.07, 0, Math.PI * 2);
      ctx.fill();
      // Door
      ctx.fillStyle = "#92400e";
      rr(ctx, x + sz * 0.38, y + sz * 0.66, sz * 0.24, sz * 0.26, 3);
      ctx.fill();
      // Sign
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(x + sz * 0.14, y + sz * 0.49, sz * 0.18, sz * 0.09);
    },
  },

  // ── Park ───────────────────────────────────────────────────────────────
  park: {
    id: "park", label: "Park", emoji: "🌳", color: "#22c55e",
    cost: 80, xpRequired: 100, population: 2,
    draw(ctx, x, y, sz) {
      // Ground
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(x + sz * 0.05, y + sz * 0.65, sz * 0.90, sz * 0.28);
      // Path
      ctx.fillStyle = "#d97706";
      ctx.fillRect(x + sz * 0.44, y + sz * 0.55, sz * 0.12, sz * 0.40);
      // Three trees
      ([
        [0.22, 0.52, sz * 0.19],
        [0.78, 0.52, sz * 0.19],
        [0.50, 0.38, sz * 0.22],
      ] as [number, number, number][]).forEach(([tx, ty, r]) => {
        ctx.fillStyle = "#92400e";
        ctx.fillRect(x + sz * tx - sz * 0.04, y + sz * ty + r * 0.5, sz * 0.08, sz * 0.18);
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(x + sz * tx, y + sz * ty, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.arc(x + sz * tx - r * 0.3, y + sz * ty + r * 0.2, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      });
      // Bench
      ctx.fillStyle = "#78350f";
      ctx.fillRect(x + sz * 0.60, y + sz * 0.64, sz * 0.22, sz * 0.04);
      ctx.fillRect(x + sz * 0.62, y + sz * 0.68, sz * 0.04, sz * 0.06);
      ctx.fillRect(x + sz * 0.76, y + sz * 0.68, sz * 0.04, sz * 0.06);
    },
  },

  // ── Market ─────────────────────────────────────────────────────────────
  market: {
    id: "market", label: "Market", emoji: "🏪", color: "#8b5cf6",
    cost: 200, xpRequired: 200, population: 10,
    draw(ctx, x, y, sz) {
      // Body
      ctx.fillStyle = "#ede9fe";
      ctx.fillRect(x + sz * 0.08, y + sz * 0.32, sz * 0.84, sz * 0.60);
      // Striped awning
      ctx.fillStyle = "#8b5cf6";
      ctx.fillRect(x + sz * 0.04, y + sz * 0.32, sz * 0.92, sz * 0.12);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "#6d28d9";
        ctx.beginPath();
        ctx.moveTo(x + sz * (0.04 + i * 0.18),        y + sz * 0.44);
        ctx.lineTo(x + sz * (0.04 + i * 0.18 + 0.09), y + sz * 0.32);
        ctx.lineTo(x + sz * (0.04 + i * 0.18 + 0.18), y + sz * 0.44);
        ctx.closePath();
        ctx.fill();
      }
      // Display windows
      ctx.fillStyle = "#a5b4fc";
      ctx.fillRect(x + sz * 0.12, y + sz * 0.50, sz * 0.30, sz * 0.20);
      ctx.fillRect(x + sz * 0.56, y + sz * 0.50, sz * 0.30, sz * 0.20);
      // Door
      ctx.fillStyle = "#4c1d95";
      rr(ctx, x + sz * 0.38, y + sz * 0.66, sz * 0.24, sz * 0.26, 2);
      ctx.fill();
      // Sign
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(x + sz * 0.20, y + sz * 0.22, sz * 0.60, sz * 0.12);
      ctx.fillStyle = "white";
      ctx.font = `bold ${Math.round(sz * 0.09)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("MARKET", x + sz / 2, y + sz * 0.28);
    },
  },

  // ── Fountain ───────────────────────────────────────────────────────────
  fountain: {
    id: "fountain", label: "Fountain", emoji: "⛲", color: "#06b6d4",
    cost: 300, xpRequired: 400, population: 0,
    draw(ctx, x, y, sz) {
      const mx = x + sz / 2;
      // Basin
      ctx.fillStyle = "#0e7490";
      ctx.beginPath();
      ctx.ellipse(mx, y + sz * 0.72, sz * 0.40, sz * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.ellipse(mx, y + sz * 0.72, sz * 0.33, sz * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pedestal
      ctx.fillStyle = "#0e7490";
      ctx.fillRect(mx - sz * 0.06, y + sz * 0.44, sz * 0.12, sz * 0.30);
      // Top bowl
      ctx.fillStyle = "#0e7490";
      ctx.beginPath();
      ctx.ellipse(mx, y + sz * 0.44, sz * 0.22, sz * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#67e8f9";
      ctx.beginPath();
      ctx.ellipse(mx, y + sz * 0.44, sz * 0.18, sz * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // Water arcs
      ctx.strokeStyle = "rgba(103,232,249,0.85)";
      ctx.lineWidth = sz * 0.035;
      ctx.lineCap = "round";
      ([ [-0.16, -0.20], [0.16, -0.20], [0, -0.26] ] as [number, number][]).forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(mx, y + sz * 0.38);
        ctx.quadraticCurveTo(
          mx + dx * sz * 0.9, y + sz * (0.38 + dy * 0.5),
          mx + dx * sz * 1.1, y + sz * (0.38 + dy),
        );
        ctx.stroke();
      });
    },
  },

  // ── Tower ──────────────────────────────────────────────────────────────
  tower: {
    id: "tower", label: "Tower", emoji: "🗼", color: "#ef4444",
    cost: 500, xpRequired: 800, population: 20,
    draw(ctx, x, y, sz, lvl) {
      const mx = x + sz / 2;
      const floors = Math.min(lvl + 3, 6);
      // Body (slightly tapered)
      ctx.fillStyle = "#fee2e2";
      ctx.beginPath();
      ctx.moveTo(x + sz * 0.22, y + sz * 0.90);
      ctx.lineTo(x + sz * 0.28, y + sz * 0.12);
      ctx.lineTo(x + sz * 0.72, y + sz * 0.12);
      ctx.lineTo(x + sz * 0.78, y + sz * 0.90);
      ctx.closePath();
      ctx.fill();
      // Floor bands + windows
      for (let i = 0; i < floors; i++) {
        const fy  = y + sz * 0.12 + (sz * 0.78 / floors) * i;
        const fw  = sz * 0.44 - (sz * 0.06 / floors) * i;
        const fx  = x + sz * 0.28 + (sz * 0.03 / floors) * i;
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(fx, fy, fw, sz * 0.03);
        ctx.fillStyle = "#fde047";
        const numW = i < 2 ? 3 : 2;
        for (let w = 0; w < numW; w++)
          ctx.fillRect(fx + fw * (0.14 + w * (0.72 / numW)), fy + sz * 0.04, fw * 0.14, sz * 0.07);
      }
      // Spire
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath();
      ctx.moveTo(x + sz * 0.30, y + sz * 0.12);
      ctx.lineTo(mx,             y + sz * 0.02);
      ctx.lineTo(x + sz * 0.70, y + sz * 0.12);
      ctx.closePath();
      ctx.fill();
    },
  },

  // ── Hospital ───────────────────────────────────────────────────────────
  hospital: {
    id: "hospital", label: "Hospital", emoji: "🏥", color: "#f1f5f9",
    cost: 400, xpRequired: 600, population: 0,
    draw(ctx, x, y, sz) {
      // Body
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(x + sz * 0.08, y + sz * 0.25, sz * 0.84, sz * 0.67);
      // Roof ledge
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(x + sz * 0.08, y + sz * 0.25, sz * 0.84, sz * 0.07);
      // Red cross (background)
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(x + sz * 0.38, y + sz * 0.08, sz * 0.24, sz * 0.50);
      ctx.fillRect(x + sz * 0.22, y + sz * 0.22, sz * 0.56, sz * 0.20);
      // Cross cutout (white centre)
      ctx.fillStyle = "white";
      ctx.fillRect(x + sz * 0.42, y + sz * 0.12, sz * 0.16, sz * 0.42);
      ctx.fillRect(x + sz * 0.26, y + sz * 0.26, sz * 0.48, sz * 0.12);
      // Windows
      ctx.fillStyle = "#bae6fd";
      [[0.14, 0.40], [0.44, 0.40], [0.74, 0.40], [0.14, 0.58], [0.74, 0.58]].forEach(([wx, wy]) =>
        ctx.fillRect(x + sz * wx, y + sz * wy, sz * 0.18, sz * 0.13)
      );
      // Door
      ctx.fillStyle = "#94a3b8";
      rr(ctx, x + sz * 0.37, y + sz * 0.68, sz * 0.26, sz * 0.24, 2);
      ctx.fill();
    },
  },

  // ── School ─────────────────────────────────────────────────────────────
  school: {
    id: "school", label: "School", emoji: "🏫", color: "#fbbf24",
    cost: 350, xpRequired: 500, population: 0,
    draw(ctx, x, y, sz) {
      // Main building
      ctx.fillStyle = "#fef9c3";
      ctx.fillRect(x + sz * 0.05, y + sz * 0.38, sz * 0.90, sz * 0.54);
      // Eave
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(x + sz * 0.05, y + sz * 0.38, sz * 0.90, sz * 0.07);
      // Bell tower
      ctx.fillStyle = "#fef9c3";
      ctx.fillRect(x + sz * 0.38, y + sz * 0.18, sz * 0.24, sz * 0.22);
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(x + sz * 0.34, y + sz * 0.18);
      ctx.lineTo(x + sz * 0.50, y + sz * 0.06);
      ctx.lineTo(x + sz * 0.66, y + sz * 0.18);
      ctx.closePath();
      ctx.fill();
      // Bell
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.arc(x + sz * 0.50, y + sz * 0.26, sz * 0.055, 0, Math.PI * 2);
      ctx.fill();
      // Windows
      ctx.fillStyle = "#bae6fd";
      [[0.12, 0.50], [0.32, 0.50], [0.56, 0.50], [0.76, 0.50]].forEach(([wx, wy]) =>
        ctx.fillRect(x + sz * wx, y + sz * wy, sz * 0.14, sz * 0.12)
      );
      // Door
      ctx.fillStyle = "#78350f";
      rr(ctx, x + sz * 0.38, y + sz * 0.68, sz * 0.24, sz * 0.24, 2);
      ctx.fill();
    },
  },

  // ── Stadium ────────────────────────────────────────────────────────────
  stadium: {
    id: "stadium", label: "Stadium", emoji: "🏟", color: "#f97316",
    cost: 600, xpRequired: 1000, population: 0,
    draw(ctx, x, y, sz) {
      const mx = x + sz / 2;
      // Outer shell
      ctx.fillStyle = "#fed7aa";
      ctx.beginPath();
      ctx.ellipse(mx, y + sz * 0.62, sz * 0.44, sz * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      // Field
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.ellipse(mx, y + sz * 0.62, sz * 0.32, sz * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      // Field markings
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(mx, y + sz * 0.62, sz * 0.16, sz * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx, y + sz * 0.45);
      ctx.lineTo(mx, y + sz * 0.79);
      ctx.stroke();
      // Upper structure
      ctx.fillStyle = "#f97316";
      ctx.fillRect(x + sz * 0.10, y + sz * 0.28, sz * 0.80, sz * 0.12);
      // Arch cutouts
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "#c2410c";
        ctx.beginPath();
        ctx.arc(x + sz * (0.18 + i * 0.16), y + sz * 0.28, sz * 0.055, Math.PI, 0);
        ctx.fill();
      }
    },
  },

  // ── Lighthouse ─────────────────────────────────────────────────────────
  lighthouse: {
    id: "lighthouse", label: "Lighthouse", emoji: "💡", color: "#818cf8",
    cost: 450, xpRequired: 700, population: 0,
    draw(ctx, x, y, sz) {
      const mx = x + sz / 2;
      // Base platform
      ctx.fillStyle = "#c7d2fe";
      ctx.fillRect(x + sz * 0.22, y + sz * 0.65, sz * 0.56, sz * 0.28);
      // Tower (tapered body)
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.moveTo(x + sz * 0.26, y + sz * 0.65);
      ctx.lineTo(x + sz * 0.34, y + sz * 0.20);
      ctx.lineTo(x + sz * 0.66, y + sz * 0.20);
      ctx.lineTo(x + sz * 0.74, y + sz * 0.65);
      ctx.closePath();
      ctx.fill();
      // Red stripes
      ctx.fillStyle = "#f97316";
      ([0.36, 0.50] as number[]).forEach((sy) => {
        const t  = (sy - 0.20) / 0.45;
        const hw = sz * 0.24 - t * sz * 0.06;
        ctx.fillRect(mx - hw, y + sz * sy, hw * 2, sz * 0.07);
      });
      // Lantern room
      ctx.fillStyle = "#4f46e5";
      ctx.fillRect(x + sz * 0.30, y + sz * 0.13, sz * 0.40, sz * 0.09);
      // Light glow
      ctx.fillStyle = "rgba(253,224,71,0.95)";
      ctx.beginPath();
      ctx.arc(mx, y + sz * 0.17, sz * 0.08, 0, Math.PI * 2);
      ctx.fill();
      // Halo
      const grd = ctx.createRadialGradient(mx, y + sz * 0.17, sz * 0.04, mx, y + sz * 0.17, sz * 0.22);
      grd.addColorStop(0, "rgba(253,224,71,0.35)");
      grd.addColorStop(1, "rgba(253,224,71,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(mx, y + sz * 0.17, sz * 0.22, 0, Math.PI * 2);
      ctx.fill();
    },
  },
};

export const ALL_BUILDING_IDS = Object.keys(BUILDING_DEFS);
