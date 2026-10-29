"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { RoverState, RoverAction } from "./useRoverAnimation";
import {
  MineralDeposit,
  MINERAL_METAS,
  getDepositKey,
  INITIAL_DEPOSIT_CONFIGS,
} from "./minerals";
import type { RadiationZone } from "../rounds/roundsConfig";
import { GRID_SIZE, MAP_MASK, START_CELL } from "./mapConfig";
import RoverModel from "./RoverModel";
import { drawChargingStation } from "./drawChargingStation";
import type { Building } from "../buildings/buildingsConfig";

// ── Tile dimensions ────────────────────────────────────────────────────────
export const TILE_W = 104;
export const TILE_H = 52;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.8;
const DEFAULT_ZOOM = 1.15;
const ZOOM_STEP = 0.15;

// ── Tile types ─────────────────────────────────────────────────────────────
type TileType =
  | "sand"
  | "dune"
  | "rock"
  | "darkrock"
  | "ridge"
  | "mineral"
  | "start"
  | "void";

interface Tile {
  type: TileType;
  elevation: number;
  crackCount: number;
  variance: number; // subtle color variance per tile
}

// Seeded pseudo-random
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Hand-placed landmarks that break up the terrain and give the sector
// a handcrafted, game-like feel. Applied only on walkable tiles; mineral
// deposits placed afterwards take precedence.
const RIDGE_CELLS: Array<[number, number]> = [
  [2, 2], [2, 4], [11, 4], [13, 7], [5, 13], [6, 14], [10, 13],
];

function generateMap(): Tile[][] {
  const rand = seededRand(42);
  const map: Tile[][] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    map[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      if (MAP_MASK[r][c] === 0) {
        map[r][c] = { type: "void", elevation: 0, crackCount: 0, variance: 0 };
        continue;
      }

      const v = rand();
      let type: TileType = "sand";
      if (v > 0.9) type = "darkrock";
      else if (v > 0.72) type = "rock";
      else if (v > 0.55) type = "dune";

      if (r === START_CELL.row && c === START_CELL.col) type = "start";

      map[r][c] = {
        type,
        elevation: Math.floor(rand() * 2),
        crackCount: Math.floor(rand() * 3),
        variance: rand() * 0.15,
      };
    }
  }

  for (const [col, row] of RIDGE_CELLS) {
    if (MAP_MASK[row]?.[col] === 1 && map[row][col].type !== "start") {
      map[row][col].type = "ridge";
      map[row][col].elevation = 2;
    }
  }
  for (const dep of INITIAL_DEPOSIT_CONFIGS) {
    if (dep.row >= 0 && dep.row < GRID_SIZE && dep.col >= 0 && dep.col < GRID_SIZE) {
      if (map[dep.row][dep.col].type !== "void") {
        map[dep.row][dep.col].type = "mineral";
      }
    }
  }

  return map;
}

const MAP = generateMap();

// Isometric painter's order: back-to-front by (col + row).
const DRAW_ORDER: Array<{ col: number; row: number }> = [];
for (let r = 0; r < GRID_SIZE; r++) {
  for (let c = 0; c < GRID_SIZE; c++) {
    DRAW_ORDER.push({ col: c, row: r });
  }
}
DRAW_ORDER.sort((a, b) => a.col + a.row - (b.col + b.row) || a.row - b.row);

// ── Color palettes — refined warm Mars tones ───────────────────────────────
const TILE_COLORS: Record<TileType, { top: string; left: string; right: string }> = {
  sand:     { top: "#bf8e64", left: "#9a7050", right: "#855d3e" },
  dune:     { top: "#cda079", left: "#a67b58", right: "#8f6746" },
  rock:     { top: "#8a6850", left: "#6e5038", right: "#5e4028" },
  darkrock: { top: "#4a2e1e", left: "#321c0e", right: "#241206" },
  ridge:    { top: "#a0785a", left: "#7c5840", right: "#62422e" },
  mineral:  { top: "#2e4a40", left: "#1e3530", right: "#142420" },
  start:    { top: "#bf8e64", left: "#9a7050", right: "#855d3e" },
  void:     { top: "transparent", left: "transparent", right: "transparent" },
};

// Darken a hex colour by a 0..1 amount.
function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)));
  return `rgb(${r},${g},${b})`;
}

// ── Coordinate transforms ──────────────────────────────────────────────────
function isoToScreen(
  col: number,
  row: number,
  originX: number,
  originY: number,
  elevation = 0
): { x: number; y: number } {
  return {
    x: originX + (col - row) * (TILE_W / 2),
    y: originY + (col + row) * (TILE_H / 2) - elevation * 4,
  };
}

// ── Crystal cluster ────────────────────────────────────────────────────────
function drawCrystalCluster(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  deposit: MineralDeposit,
  time: number
) {
  const meta = MINERAL_METAS[deposit.type];
  const isDepleted = deposit.depleted || deposit.remainingAmount <= 0;
  const ratio = deposit.remainingAmount / deposit.totalAmount;

  ctx.save();
  ctx.translate(cx, cy);

  if (isDepleted) {
    ctx.fillStyle = "#1e2922";
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = meta.color + "55";
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(-2, -2);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(2, -2);
    ctx.lineTo(3, 0);
    ctx.fill();
    ctx.restore();
    return;
  }

  const pulse = 0.85 + 0.15 * Math.sin(time * 0.003 + deposit.col * 2 + deposit.row);

  // Ground aura
  const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
  auraGrad.addColorStop(0, meta.color + "35");
  auraGrad.addColorStop(1, "transparent");
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const sizeScale = 0.5 + 0.5 * ratio;

  const spires = [
    { dx: -6, dy: -1, w: 4.5, h: 12 * sizeScale, tilt: -1.5 },
    { dx: 5, dy: 0, w: 4.5, h: 10 * sizeScale, tilt: 1.5 },
    { dx: 0, dy: 2, w: 5.5, h: 17 * sizeScale, tilt: 0 },
    { dx: -2, dy: 4, w: 3.5, h: 8 * sizeScale, tilt: 0 },
  ];

  ctx.shadowBlur = 5 * pulse;
  ctx.shadowColor = meta.glowColor;

  for (const s of spires) {
    const bx = s.dx;
    const by = s.dy;
    const apexX = bx + s.tilt;
    const apexY = by - s.h;

    ctx.fillStyle = meta.bgRgba;
    ctx.beginPath();
    ctx.moveTo(bx - s.w / 2, by);
    ctx.lineTo(apexX, apexY);
    ctx.lineTo(bx, by + 1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = meta.color;
    ctx.beginPath();
    ctx.moveTo(bx + s.w / 2, by);
    ctx.lineTo(apexX, apexY);
    ctx.lineTo(bx, by + 1);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(bx, by + 1);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(apexX, apexY, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  if (deposit.type === "pythorium" || deposit.type === "javium") {
    const sparkT = (time * 0.002 + deposit.col) % 1;
    const sparkX = Math.sin(time * 0.004) * 6;
    const sparkY = -12 - sparkT * 8;
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 6;
    ctx.shadowColor = meta.color;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 0.8 * (1 - sparkT), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── Objective beacon — floating marker above active deposits ───────────────
function drawObjectiveBeacon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  deposit: MineralDeposit,
  time: number
) {
  if (deposit.depleted || deposit.remainingAmount <= 0) return;

  const meta = MINERAL_METAS[deposit.type];
  const bob = Math.sin(time * 0.003 + deposit.col * 1.7 + deposit.row) * 3;
  const topY = cy - 34 + bob;

  ctx.save();

  // Light beam
  const beam = ctx.createLinearGradient(cx, cy - 6, cx, topY);
  beam.addColorStop(0, meta.color + "00");
  beam.addColorStop(0.7, meta.color + "22");
  beam.addColorStop(1, meta.color + "66");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy - 6);
  ctx.lineTo(cx + 2, cy - 6);
  ctx.lineTo(cx + 1, topY);
  ctx.lineTo(cx - 1, topY);
  ctx.closePath();
  ctx.fill();

  // Floating diamond
  ctx.translate(cx, topY);
  ctx.rotate(Math.PI / 4);
  ctx.shadowBlur = 10;
  ctx.shadowColor = meta.glowColor;
  ctx.fillStyle = meta.color;
  ctx.fillRect(-3.5, -3.5, 7, 7);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(-1.5, -1.5, 3, 3);

  ctx.restore();
}

// ── Radiation zone ─────────────────────────────────────────────────────────
function drawRadiationZone(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  time: number
) {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);

  ctx.save();

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + hw, sy + hh);
  ctx.lineTo(sx + TILE_W, sy);
  ctx.lineTo(sx + hw, sy - hh);
  ctx.closePath();
  ctx.fillStyle = `rgba(251,113,133,${0.1 + pulse * 0.1})`;
  ctx.fill();

  ctx.strokeStyle = `rgba(251,113,133,${0.4 + pulse * 0.35})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + hw, sy + hh);
  ctx.lineTo(sx + TILE_W, sy);
  ctx.lineTo(sx + hw, sy - hh);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  const symbolCx = sx + hw;
  const symbolCy = sy - 1;
  ctx.font = `bold ${10 + pulse * 2}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 5 + pulse * 5;
  ctx.shadowColor = "rgba(251,113,133,0.7)";
  ctx.fillStyle = `rgba(251,113,133,${0.6 + pulse * 0.3})`;
  ctx.fillText("☢", symbolCx, symbolCy);

  ctx.restore();
}

// ── Borehole ───────────────────────────────────────────────────────────────
function drawBorehole(ctx: CanvasRenderingContext2D, cx: number, cy: number, count: number) {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = "#1e130a";
  ctx.beginPath();
  ctx.ellipse(0, 1, 6 + Math.min(count, 4), 3 + Math.min(count, 2.5), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0a0603";
  ctx.beginPath();
  ctx.ellipse(0, 1.5, 3.5, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7a5535";
  ctx.beginPath();
  ctx.arc(-6, 0, 0.9, 0, Math.PI * 2);
  ctx.arc(6, 0.5, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── Draw a single tile ─────────────────────────────────────────────────────
function drawTile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tile: Tile,
  col: number,
  row: number,
  highlight = false,
  deposit?: MineralDeposit,
  drilledCount?: number,
  time = 0,
  isEdgeTile = false
) {
  if (tile.type === "void") return;

  const { top, left, right } = TILE_COLORS[tile.type];
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  // Edge tiles are given a taller cliff face so the landmass reads as a
  // raised island over the abyss rather than a flat cut-out.
  const depth = (isEdgeTile ? 40 : 32) + tile.elevation * 4;

  // Top face
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + hw, sy + hh);
  ctx.lineTo(sx + TILE_W, sy);
  ctx.lineTo(sx + hw, sy - hh);
  ctx.closePath();

  if (highlight) {
    const grad = ctx.createLinearGradient(sx, sy - hh, sx + TILE_W, sy + hh);
    grad.addColorStop(0, "#00d4ff35");
    grad.addColorStop(1, top);
    ctx.fillStyle = grad;
  } else if (deposit && !deposit.depleted) {
    const meta = MINERAL_METAS[deposit.type];
    const grad = ctx.createLinearGradient(sx, sy - hh, sx + TILE_W, sy + hh);
    grad.addColorStop(0, meta.color + "20");
    grad.addColorStop(1, top);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = top;
  }
  ctx.fill();

  // Grid edge
  ctx.strokeStyle = highlight ? "rgba(0,212,255,0.6)" : "rgba(255,255,255,0.06)";
  ctx.lineWidth = highlight ? 1 : 0.5;
  ctx.stroke();

  // Edge glow for tiles bordering void
  if (isEdgeTile) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,140,60,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + hw, sy + hh);
    ctx.lineTo(sx + TILE_W, sy);
    ctx.lineTo(sx + hw, sy - hh);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Left face
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy + depth);
  ctx.lineTo(sx + hw, sy + hh + depth);
  ctx.lineTo(sx + hw, sy + hh);
  ctx.closePath();
  const leftGrad = ctx.createLinearGradient(sx, sy, sx, sy + hh + depth);
  leftGrad.addColorStop(0, left);
  leftGrad.addColorStop(1, darken(left, 0.35));
  ctx.fillStyle = leftGrad;
  ctx.fill();

  // Right face
  ctx.beginPath();
  ctx.moveTo(sx + hw, sy + hh);
  ctx.lineTo(sx + hw, sy + hh + depth);
  ctx.lineTo(sx + TILE_W, sy + depth);
  ctx.lineTo(sx + TILE_W, sy);
  ctx.closePath();
  const rightGrad = ctx.createLinearGradient(sx + hw, sy, sx + TILE_W, sy + depth);
  rightGrad.addColorStop(0, right);
  rightGrad.addColorStop(1, darken(right, 0.45));
  ctx.fillStyle = rightGrad;
  ctx.fill();

  // Warm rim light along the outer cliff edge
  if (isEdgeTile) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,170,90,0.35)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx, sy + depth);
    ctx.lineTo(sx + hw, sy + hh + depth);
    ctx.lineTo(sx + TILE_W, sy + depth);
    ctx.stroke();
    ctx.restore();
  }

  const cx = sx + hw;
  const cy = sy;

  // ── Terrain detail ──────────────────────────────────────────────────────
  if (tile.type === "dune") {
    ctx.save();
    ctx.strokeStyle = "rgba(90,60,35,0.22)";
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(cx + (i - 1) * 7, cy + 2 - i * 2, 13 - i * 2, 3, 0, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (tile.type === "ridge") {
    ctx.save();
    ctx.strokeStyle = "rgba(255,220,180,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy - 4);
    ctx.lineTo(cx - 6, cy - 12);
    ctx.lineTo(cx + 10, cy - 5);
    ctx.lineTo(cx + 24, cy - 11);
    ctx.stroke();
    ctx.restore();
  }

  // Micro-cracks
  if (tile.crackCount > 0 && tile.type !== "mineral") {
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 0.4;
    for (let i = 0; i < tile.crackCount; i++) {
      const ox = sx + hw * 0.4 + ((i * 14) % (TILE_W * 0.6));
      const oy = sy - hh * 0.15 + i * 2;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + 4 + i, oy + 2 + i * 0.5);
      ctx.stroke();
    }
  }

  if (drilledCount && drilledCount > 0) {
    drawBorehole(ctx, cx, cy, drilledCount);
  }

  if (deposit) {
    drawCrystalCluster(ctx, cx, cy, deposit, time);
    drawObjectiveBeacon(ctx, cx, cy, deposit, time);
  }

  // Start tile — landing pad with rotating beacon ring
  const isStartSite =
    tile.type === "start" ||
    (col === START_CELL.col && row === START_CELL.row);
  if (isStartSite) {
    ctx.save();
    ctx.translate(cx, cy);

    // Outer pad glow
    const padGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
    padGlow.addColorStop(0, "rgba(0,212,255,0.22)");
    padGlow.addColorStop(1, "transparent");
    ctx.fillStyle = padGlow;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Concentric pad rings
    ctx.strokeStyle = "rgba(0,212,255,0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0,212,255,0.3)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating sweep arc
    const sweep = time * 0.0015;
    ctx.strokeStyle = "rgba(0,212,255,0.8)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 7, 0, sweep, sweep + Math.PI * 0.35);
    ctx.stroke();

    // Corner lights
    const lightPulse = 0.55 + 0.45 * Math.sin(time * 0.005);
    ctx.fillStyle = `rgba(0,212,255,${lightPulse})`;
    [[-14, 0], [14, 0], [0, -7], [0, 7]].forEach(([lx, ly]) => {
      ctx.beginPath();
      ctx.arc(lx, ly, 1.3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Center marker
    ctx.fillStyle = "rgba(0,212,255,0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Check if tile borders the void ─────────────────────────────────────────
function isEdge(row: number, col: number): boolean {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE || MAP_MASK[nr][nc] === 0) {
      return true;
    }
  }
  return false;
}

// ── Props ──────────────────────────────────────────────────────────────────
interface IsometricGridProps {
  roverState: RoverState;
  isPlaying: boolean;
  progress: number;
  currentAction: RoverAction | null;
  radiationZones?: RadiationZone[];
  buildings?: Building[];
  placingBuilding?: boolean;
  onPlaceBuilding?: (col: number, row: number) => void;
}

export default function IsometricGrid({
  roverState,
  isPlaying,
  progress,
  currentAction,
  radiationZones = [],
  buildings = [],
  placingBuilding = false,
  onPlaceBuilding,
}: IsometricGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<Array<{ col: number; row: number }>>([]);
  const prevPosRef = useRef({ col: roverState.col, row: roverState.row });
  const [previousPosition, setPreviousPosition] = useState({
    col: roverState.col,
    row: roverState.row,
  });
  const rafRef = useRef<number | null>(null);

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panInitializedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const tilePosRef = useRef<Record<string, { sx: number; sy: number }>>({});
  const transformRef = useRef({ w: 0, h: 0, scale: 1, panX: 0, panY: 0 });
  const hoverTileRef = useRef<{ col: number; row: number } | null>(null);

  const isPlaceable = useCallback(
    (col: number, row: number) => {
      if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return false;
      if (MAP_MASK[row][col] === 0) return false;
      if (col === START_CELL.col && row === START_CELL.row) return false;
      if (col === roverState.col && row === roverState.row) return false;
      if (buildings.some((b) => b.col === col && b.row === row)) return false;
      const deposit = roverState.deposits[getDepositKey(col, row)];
      if (deposit && !deposit.depleted) return false;
      return true;
    },
    [buildings, roverState.col, roverState.row, roverState.deposits]
  );

  const screenToWorld = useCallback((px: number, py: number) => {
    const t = transformRef.current;
    return {
      x: (px - (t.w / 2 + t.panX)) / t.scale + t.w / 2,
      y: (py - (t.h / 2 + t.panY)) / t.scale + t.h / 2,
    };
  }, []);

  const pickTile = useCallback((worldX: number, worldY: number) => {
    for (let i = DRAW_ORDER.length - 1; i >= 0; i--) {
      const { col, row } = DRAW_ORDER[i];
      if (MAP_MASK[row][col] === 0) continue;
      const pos = tilePosRef.current[`${col},${row}`];
      if (!pos) continue;
      const cx = pos.sx + TILE_W / 2;
      const cy = pos.sy;
      if (
        Math.abs(worldX - cx) / (TILE_W / 2) +
          Math.abs(worldY - cy) / (TILE_H / 2) <=
        1
      ) {
        return { col, row };
      }
    }
    return null;
  }, []);

  // Trail tracking
  useEffect(() => {
    const prev = prevPosRef.current;
    if (prev.col !== roverState.col || prev.row !== roverState.row) {
      trailRef.current = [
        ...trailRef.current.slice(-32),
        { col: prev.col, row: prev.row },
      ];
      prevPosRef.current = { col: roverState.col, row: roverState.row };
      setPreviousPosition(prev);
    }
  }, [roverState.col, roverState.row]);

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    }

    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Space background
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
    bgGrad.addColorStop(0, "#0d1523");
    bgGrad.addColorStop(0.6, "#090e18");
    bgGrad.addColorStop(1, "#050810");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Starfield (seeded for consistency)
    const stars = [
      [w * 0.08, h * 0.08, 0.8], [w * 0.92, h * 0.06, 1.2], [w * 0.5, h * 0.04, 0.9],
      [w * 0.18, h * 0.14, 0.6], [w * 0.82, h * 0.18, 1], [w * 0.12, h * 0.88, 0.7],
      [w * 0.93, h * 0.82, 0.5], [w * 0.68, h * 0.94, 0.8], [w * 0.38, h * 0.02, 1.1],
      [w * 0.6, h * 0.96, 0.7], [w * 0.25, h * 0.5, 0.5], [w * 0.75, h * 0.5, 0.6],
      [w * 0.03, h * 0.45, 0.4], [w * 0.97, h * 0.55, 0.4],
    ];
    const twinkle = 0.4 + 0.2 * Math.sin(time * 0.001);
    stars.forEach(([sx, sy, r]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${twinkle + r * 0.1})`;
      ctx.fill();
    });

    // World transform
    const originX = w / 2 - TILE_W / 2;
    const originY = h / 2 - ((GRID_SIZE - 1) / 2) * TILE_H;

    const gridW = GRID_SIZE * TILE_W;
    const gridH = GRID_SIZE * TILE_H + 36;
    const padding = 32;
    const autoScale = Math.min(1.2, Math.max(0.35, Math.min((w - padding) / gridW, (h - padding) / gridH)));
    const totalScale = autoScale * zoom;

    transformRef.current = { w, h, scale: totalScale, panX: pan.x, panY: pan.y };

    ctx.save();
    ctx.translate(w / 2 + pan.x, h / 2 + pan.y);
    ctx.scale(totalScale, totalScale);
    ctx.translate(-w / 2, -h / 2);

    const holesMap = new Map<string, number>();
    for (const hItem of roverState.drilledHoles) {
      holesMap.set(getDepositKey(hItem.col, hItem.row), hItem.count);
    }

    const buildingByKey = new Map<string, Building>();
    for (const building of buildings) {
      buildingByKey.set(`${building.col},${building.row}`, building);
    }

    // Draw tiles (painter's sort, back to front)
    for (const { col: c, row: r } of DRAW_ORDER) {
      const tile = MAP[r][c];
      if (tile.type === "void") continue;
      const { x: sx, y: sy } = isoToScreen(c, r, originX, originY, tile.elevation);
      tilePosRef.current[`${c},${r}`] = { sx, sy };
      const onTrail = trailRef.current.some((t) => t.col === c && t.row === r);
      const isRoverPos = c === roverState.col && r === roverState.row;

      const depKey = getDepositKey(c, r);
      const deposit = roverState.deposits[depKey];
      const drilledCount = holesMap.get(depKey);
      const edgeTile = isEdge(r, c);

      drawTile(
        ctx,
        sx,
        sy,
        tile,
        c,
        r,
        onTrail && !isRoverPos,
        deposit,
        drilledCount,
        time,
        edgeTile
      );

      if (buildingByKey.has(`${c},${r}`)) {
        drawChargingStation(ctx, sx + TILE_W / 2, sy, time);
      }

      const isRadiation = radiationZones.some((z) => z.col === c && z.row === r);
      if (isRadiation) {
        drawRadiationZone(ctx, sx, sy, time);
      }
    }

    const hover = hoverTileRef.current;
    if (placingBuilding && hover) {
      const pos = tilePosRef.current[`${hover.col},${hover.row}`];
      if (pos) {
        drawChargingStation(ctx, pos.sx + TILE_W / 2, pos.sy, time, {
          ghost: true,
          invalid: !isPlaceable(hover.col, hover.row),
        });
      }
    }

    ctx.restore();
  }, [
    roverState,
    zoom,
    pan,
    radiationZones,
    buildings,
    placingBuilding,
    isPlaceable,
  ]);

  // Animation loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      draw(timestamp);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
      draw(performance.now());
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  // Center the map in the empty area to the right of the mission window
  useEffect(() => {
    if (!panInitializedRef.current && containerSize.width > 0) {
      panInitializedRef.current = true;
      const missionWindowWidth = Math.min(
        620,
        Math.max(360, containerSize.width * 0.38)
      );
      setPan({ x: missionWindowWidth / 2, y: 0 });
    }
  }, [containerSize.width]);

  // Pan/zoom handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (placingBuilding && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      hoverTileRef.current = pickTile(world.x, world.y);
    }

    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (placingBuilding && onPlaceBuilding && containerRef.current) {
      const down = pointerDownRef.current;
      const moved = down
        ? Math.hypot(e.clientX - down.x, e.clientY - down.y)
        : Infinity;
      if (moved < 6) {
        const rect = containerRef.current.getBoundingClientRect();
        const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        const tile = pickTile(world.x, world.y);
        if (tile) onPlaceBuilding(tile.col, tile.row);
      }
    }

    pointerDownRef.current = null;
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handlePointerLeave = () => {
    if (placingBuilding) hoverTileRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((prev * factor).toFixed(2)))));
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2))));
  };

  const handleResetView = (e: React.MouseEvent) => {
    e.stopPropagation();
    const w = containerRef.current?.clientWidth ?? 0;
    const missionWindowWidth = Math.min(620, Math.max(360, w * 0.38));
    setZoom(DEFAULT_ZOOM);
    setPan({ x: missionWindowWidth / 2, y: 0 });
  };

  const handleCenterRover = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const originX = w / 2 - TILE_W / 2;
    const originY = h / 2 - ((GRID_SIZE - 1) / 2) * TILE_H;
    const { x: curSx, y: curSy } = isoToScreen(roverState.col, roverState.row, originX, originY);
    const roverCenterX = curSx + TILE_W / 2;
    const roverCenterY = curSy;
    setPan({
      x: ((w / 2) - roverCenterX) * autoScale,
      y: ((h / 2) - roverCenterY) * autoScale,
    });
  };

  // Compute rover model position
  const currentTileDeposit = roverState.deposits[getDepositKey(roverState.col, roverState.row)];
  const containerWidth = containerSize.width;
  const containerHeight = containerSize.height;
  const gridW = GRID_SIZE * TILE_W;
  const gridH = GRID_SIZE * TILE_H + 36;
  const padding = 32;
  const autoScale = Math.min(
    1.2,
    Math.max(
      0.35,
      Math.min(
        (containerWidth - padding) / gridW,
        (containerHeight - padding) / gridH
      )
    )
  );
  const modelScale = autoScale * zoom;
  const modelOriginX = containerWidth / 2 - TILE_W / 2;
  const modelOriginY = containerHeight / 2 - ((GRID_SIZE - 1) / 2) * TILE_H;
  const previousScreen = isoToScreen(
    previousPosition.col,
    previousPosition.row,
    modelOriginX,
    modelOriginY
  );
  const currentScreen = isoToScreen(
    roverState.col,
    roverState.row,
    modelOriginX,
    modelOriginY
  );
  const modelWorldX = previousScreen.x + (currentScreen.x - previousScreen.x) * progress;
  const modelWorldY = previousScreen.y + (currentScreen.y - previousScreen.y) * progress;
  const modelX = containerWidth / 2 + pan.x + (modelWorldX - containerWidth / 2) * modelScale;
  const modelY = containerHeight / 2 + pan.y + (modelWorldY - containerHeight / 2) * modelScale;
  const modelTile = MAP[roverState.row]?.[roverState.col] ?? MAP[0][0];
  const isDrillingAction = currentAction?.action === "DRILL" || roverState.isDrilling;
  const isMovingAction = currentAction?.action === "DRIVE" && roverState.isMoving;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onWheel={handleWheel}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        cursor: placingBuilding ? "crosshair" : isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <RoverModel
        x={modelX + (TILE_W / 2) * modelScale}
        y={modelY - (14 + modelTile.elevation * 3) * modelScale}
        scale={modelScale}
        facing={roverState.facing}
        isMoving={isMovingAction}
        isDrilling={isDrillingAction}
      />

      {/* Top Left: Sector info badge */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: "var(--radius-md)",
          background: "rgba(7,9,15,0.88)",
          border: "1px solid var(--space-border)",
          fontFamily: "var(--font-code)",
          fontSize: 10,
          color: "var(--text-secondary)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          pointerEvents: "none",
        }}
      >
        <span style={{ color: "var(--mars-orange)", fontWeight: 700 }}>🗺 Sector 15×15</span>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
        <span>Irregular Terrain</span>
      </div>

      {/* Bottom Left: Position overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: "var(--radius-md)",
          background: "rgba(7,9,15,0.88)",
          border: "1px solid var(--space-border)",
          fontFamily: "var(--font-code)",
          fontSize: 10,
          color: "var(--glow-cyan)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          pointerEvents: "none",
        }}
      >
        <span>{roverState.facing}</span>
        {currentTileDeposit && !currentTileDeposit.depleted && (
          <span
            style={{
              padding: "1px 5px",
              borderRadius: 3,
              background: MINERAL_METAS[currentTileDeposit.type].bgRgba,
              border: `1px solid ${MINERAL_METAS[currentTileDeposit.type].color}`,
              color: MINERAL_METAS[currentTileDeposit.type].color,
              fontSize: 9,
              fontWeight: 600,
            }}
          >
            {MINERAL_METAS[currentTileDeposit.type].icon}{" "}
            {MINERAL_METAS[currentTileDeposit.type].shortName} ({currentTileDeposit.remainingAmount}u)
          </span>
        )}
      </div>

      {/* Bottom Right: Camera controls */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          display: "flex",
          alignItems: "center",
          gap: 3,
          padding: "2px",
          borderRadius: "var(--radius-md)",
          background: "rgba(7,9,15,0.88)",
          border: "1px solid var(--space-border)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          zIndex: 5,
        }}
      >
        <button
          onClick={handleZoomIn}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Zoom In"
          disabled={zoom >= MAX_ZOOM}
          style={{
            width: 24,
            height: 24,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: 12,
            fontWeight: 700,
            cursor: zoom >= MAX_ZOOM ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: zoom >= MAX_ZOOM ? 0.35 : 1,
          }}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Zoom Out"
          disabled={zoom <= MIN_ZOOM}
          style={{
            width: 24,
            height: 24,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: 12,
            fontWeight: 700,
            cursor: zoom <= MIN_ZOOM ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: zoom <= MIN_ZOOM ? 0.35 : 1,
          }}
        >
          −
        </button>
        <button
          onClick={handleCenterRover}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Center on Rover"
          style={{
            width: 24,
            height: 24,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-sm)",
            color: "var(--glow-cyan)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 1,
          }}
        >
          🎯
        </button>
        <button
          onClick={handleResetView}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Reset View"
          style={{
            width: 24,
            height: 24,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 1,
          }}
        >
          ⟲
        </button>
      </div>

      {/* Top Right: Playback indicator */}
      {isPlaying && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: "var(--radius-md)",
            background: "rgba(7,9,15,0.88)",
            border: currentAction?.action === "DRILL"
              ? "1px solid var(--glow-amber, #ffb700)"
              : "1px solid var(--glow-green)",
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            fontWeight: 600,
            color: currentAction?.action === "DRILL"
              ? "var(--glow-amber, #ffb700)"
              : "var(--glow-green)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: currentAction?.action === "DRILL"
                ? "var(--glow-amber, #ffb700)"
                : "var(--glow-green)",
              animation: "pulse-glow 0.8s ease-in-out infinite",
            }}
          />
          {currentAction?.action === "DRILL" ? "DRILLING" : "EXECUTING"}
        </div>
      )}
    </div>
  );
}
