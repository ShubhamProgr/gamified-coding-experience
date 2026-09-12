"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { RoverState, RoverFacing, RoverAction } from "./useRoverAnimation";
import {
  MineralDeposit,
  MINERAL_METAS,
  getDepositKey,
  INITIAL_DEPOSIT_CONFIGS,
} from "./minerals";

// ── Isometric constants ────────────────────────────────────────────────────

export const TILE_W = 104;
export const TILE_H = 52;
export const GRID_SIZE = 9;

// ── Tile types ─────────────────────────────────────────────────────────────

type TileType = "sand" | "rock" | "darkrock" | "mineral" | "start";

interface Tile {
  type: TileType;
  elevation: number; // subtle height variation 0..2
  crackCount: number;
}

// Seeded pseudo-random for deterministic map
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateMap(): Tile[][] {
  const rand = seededRand(42);
  const map: Tile[][] = [];
  const startCol = Math.floor(GRID_SIZE / 2);
  const startRow = Math.floor(GRID_SIZE / 2);

  for (let r = 0; r < GRID_SIZE; r++) {
    map[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = rand();
      let type: TileType = "sand";
      if (v > 0.85) type = "darkrock";
      else if (v > 0.65) type = "rock";
      if (r === startRow && c === startCol) type = "start";
      map[r][c] = { type, elevation: 0, crackCount: Math.floor(rand() * 3) };
    }
  }

  // Stamp configured mineral deposit tiles
  for (const dep of INITIAL_DEPOSIT_CONFIGS) {
    if (dep.row >= 0 && dep.row < GRID_SIZE && dep.col >= 0 && dep.col < GRID_SIZE) {
      map[dep.row][dep.col].type = "mineral";
    }
  }

  return map;
}

const MAP = generateMap();

// ── Color palettes ─────────────────────────────────────────────────────────

const TILE_COLORS: Record<TileType, { top: string; left: string; right: string }> = {
  sand:     { top: "#c4956a", left: "#a07550", right: "#8a6040" },
  rock:     { top: "#9a7255", left: "#7a5535", right: "#6a4525" },
  darkrock: { top: "#5a3a25", left: "#3a2010", right: "#2a1508" },
  mineral:  { top: "#3a564c", left: "#243d34", right: "#1a2c25" },
  start:    { top: "#c4956a", left: "#a07550", right: "#8a6040" },
};

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
    y: originY + (col + row) * (TILE_H / 2) - elevation * 5,
  };
}

// ── 3D Crystal Cluster Drawing ─────────────────────────────────────────────

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
  ctx.scale(1.15, 1.15);

  if (isDepleted) {
    // Shattered crystal stump / excavated pit
    ctx.fillStyle = "#1e2922";
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Small fractured shard stumps
    ctx.fillStyle = meta.color + "55";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-3, -4);
    ctx.lineTo(-1, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(4, -3);
    ctx.lineTo(6, 0);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Pulsing ambient glow
  const pulse = 0.85 + 0.15 * Math.sin(time * 0.003 + deposit.col * 2 + deposit.row);

  // Radial ground aura
  const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
  auraGrad.addColorStop(0, meta.color + "40");
  auraGrad.addColorStop(1, "transparent");
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Spires scale according to remaining reserves
  const sizeScale = 0.6 + 0.4 * ratio;

  // Spires specifications: [dx, dy, width, height, tiltX]
  const spires = [
    { dx: -7, dy: -2, w: 5, h: 14 * sizeScale, tilt: -2 },
    { dx: 6, dy: 1, w: 5, h: 12 * sizeScale, tilt: 2 },
    { dx: 0, dy: 2, w: 7, h: 22 * sizeScale, tilt: 0 },
    { dx: -1, dy: 5, w: 4, h: 9 * sizeScale, tilt: -1 },
  ];

  ctx.shadowBlur = 8 * pulse;
  ctx.shadowColor = meta.glowColor;

  for (const s of spires) {
    const bx = s.dx;
    const by = s.dy;
    const apexX = bx + s.tilt;
    const apexY = by - s.h;

    // Left face (shaded)
    ctx.fillStyle = meta.bgRgba;
    ctx.beginPath();
    ctx.moveTo(bx - s.w / 2, by);
    ctx.lineTo(apexX, apexY);
    ctx.lineTo(bx, by + 2);
    ctx.closePath();
    ctx.fill();

    // Right face (bright specular)
    ctx.fillStyle = meta.color;
    ctx.beginPath();
    ctx.moveTo(bx + s.w / 2, by);
    ctx.lineTo(apexX, apexY);
    ctx.lineTo(bx, by + 2);
    ctx.closePath();
    ctx.fill();

    // Crystal facet edge
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(bx, by + 2);
    ctx.stroke();

    // Glint on peak
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(apexX, apexY, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floating micro-glint sparkles for exotic / rare minerals
  if (deposit.type === "xenocryst" || deposit.type === "lithium") {
    const sparkT = (time * 0.002 + deposit.col) % 1;
    const sparkX = Math.sin(time * 0.004) * 10;
    const sparkY = -20 - sparkT * 12;
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 10;
    ctx.shadowColor = meta.color;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 1.2 * (1 - sparkT), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── Borehole / Excavation Crater ────────────────────────────────────────────

function drawBorehole(ctx: CanvasRenderingContext2D, cx: number, cy: number, count: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.15, 1.15);

  // Scorched outer rim
  ctx.fillStyle = "#1e130a";
  ctx.beginPath();
  ctx.ellipse(0, 2, 7 + Math.min(count, 3), 3.5 + Math.min(count, 2), 0, 0, Math.PI * 2);
  ctx.fill();

  // Deep hole core
  ctx.fillStyle = "#0a0603";
  ctx.beginPath();
  ctx.ellipse(0, 2.5, 4.5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Small excavated rubble specks
  ctx.fillStyle = "#7a5535";
  ctx.beginPath();
  ctx.arc(-7, 0, 1, 0, Math.PI * 2);
  ctx.arc(8, 1, 1.2, 0, Math.PI * 2);
  ctx.arc(-3, 5, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── Drawing primitives ─────────────────────────────────────────────────────

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
  time = 0
) {
  const { top, left, right } = TILE_COLORS[tile.type];
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  const depth = 11 + tile.elevation * 2;

  // Top face (rhombus)
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + hw, sy + hh);
  ctx.lineTo(sx + TILE_W, sy);
  ctx.lineTo(sx + hw, sy - hh);
  ctx.closePath();
  if (highlight) {
    const grad = ctx.createLinearGradient(sx, sy - hh, sx + TILE_W, sy + hh);
    grad.addColorStop(0, "#00d4ff45");
    grad.addColorStop(1, top);
    ctx.fillStyle = grad;
  } else if (deposit && !deposit.depleted) {
    const meta = MINERAL_METAS[deposit.type];
    const grad = ctx.createLinearGradient(sx, sy - hh, sx + TILE_W, sy + hh);
    grad.addColorStop(0, meta.color + "25");
    grad.addColorStop(1, top);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = top;
  }
  ctx.fill();

  // Grid line border on top
  ctx.strokeStyle = highlight ? "rgba(0, 212, 255, 0.7)" : "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = highlight ? 1.5 : 0.8;
  ctx.stroke();

  // Subtle coordinate stamp on tile top face
  ctx.save();
  ctx.font = "600 8.5px 'Fira Code', monospace";
  ctx.fillStyle = highlight ? "rgba(0, 212, 255, 0.9)" : "rgba(255, 255, 255, 0.32)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`(${col},${row})`, sx + hw, sy - hh + 11);
  ctx.restore();

  // Left face
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy + depth);
  ctx.lineTo(sx + hw, sy + hh + depth);
  ctx.lineTo(sx + hw, sy + hh);
  ctx.closePath();
  ctx.fillStyle = left;
  ctx.fill();

  // Right face
  ctx.beginPath();
  ctx.moveTo(sx + hw, sy + hh);
  ctx.lineTo(sx + hw, sy + hh + depth);
  ctx.lineTo(sx + TILE_W, sy + depth);
  ctx.lineTo(sx + TILE_W, sy);
  ctx.closePath();
  ctx.fillStyle = right;
  ctx.fill();

  const cx = sx + hw;
  const cy = sy;

  // Procedural cracks on top
  if (tile.crackCount > 0 && tile.type !== "mineral") {
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 0.7;
    for (let i = 0; i < tile.crackCount; i++) {
      const ox = sx + hw * 0.4 + ((i * 24) % (TILE_W * 0.7));
      const oy = sy - hh * 0.2 + i * 4;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + 8 + i * 2, oy + 3 + i);
      ctx.stroke();
    }
  }

  // Render Borehole if drilled
  if (drilledCount && drilledCount > 0) {
    drawBorehole(ctx, cx, cy, drilledCount);
  }

  // Render 3D Mineral Crystals if deposit exists
  if (deposit) {
    drawCrystalCluster(ctx, cx, cy, deposit, time);
  }

  // Start tile marker (Center base station at 4, 4)
  const isStartSite = tile.type === "start" || (col === Math.floor(GRID_SIZE / 2) && row === Math.floor(GRID_SIZE / 2));
  if (isStartSite) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 15, 7.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,212,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,212,255,0.85)";
    ctx.fill();
    ctx.restore();
  }
}

// ── Rover Drawing with Dynamic Drill Assembly ──────────────────────────────

function drawRover(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  facing: RoverFacing,
  battery: number,
  isDrilling: boolean,
  progress: number,
  time: number,
  lastDrillResult: RoverState["lastDrillResult"]
) {
  const hw = TILE_W / 2;
  // Rover body center relative to tile top-center
  let cx = sx + hw;
  let cy = sy - 3;

  // Mechanical vibration shake when active drill
  if (isDrilling) {
    cx += (Math.sin(time * 0.08) + Math.cos(time * 0.13)) * 1.5;
    cy += (Math.cos(time * 0.09) - Math.sin(time * 0.11)) * 1.2;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.15, 1.15);

  // Battery glow color
  const batteryColor =
    battery > 60 ? "#00ff88" :
    battery > 30 ? "#ffb700" :
    "#ff4444";

  // Glow effect
  ctx.shadowBlur = 18;
  ctx.shadowColor = isDrilling ? "var(--glow-amber, #ffb700)" : batteryColor;

  // Body (rounded rect)
  const bw = 24, bh = 14;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2 - 8, bw, bh, 3);
  ctx.fillStyle = "#1e2d42";
  ctx.fill();
  ctx.strokeStyle = isDrilling ? "#ff9900" : batteryColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Solar panels
  ctx.fillStyle = "#2a4a6a";
  ctx.strokeStyle = "#00d4ff55";
  ctx.lineWidth = 1;
  // Left panel
  ctx.beginPath();
  ctx.rect(-bw / 2 - 10, -bh / 2 - 10, 10, 6);
  ctx.fill(); ctx.stroke();
  // Right panel
  ctx.beginPath();
  ctx.rect(bw / 2, -bh / 2 - 10, 10, 6);
  ctx.fill(); ctx.stroke();

  // Camera arm (top)
  ctx.beginPath();
  ctx.moveTo(0, -bh / 2 - 8);
  ctx.lineTo(0, -bh / 2 - 18);
  ctx.strokeStyle = "#4a6a8a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Camera eye
  ctx.beginPath();
  ctx.arc(0, -bh / 2 - 19, 3, 0, Math.PI * 2);
  ctx.fillStyle = batteryColor;
  ctx.fill();

  // Wheels (6 wheels, isometric style)
  const wheelColor = "#0d1117";
  const wheelAccent = "#4a6a8a";
  const wheels = [
    [-bw / 2 - 2, -4], [-bw / 2 - 2, 0], [-bw / 2 - 2, 4],
    [ bw / 2 + 2,  -4], [ bw / 2 + 2,  0], [ bw / 2 + 2,  4],
  ];
  ctx.shadowBlur = 0;
  wheels.forEach(([wx, wy]) => {
    ctx.beginPath();
    ctx.ellipse(wx, wy - 8 + 4, 4, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = wheelColor;
    ctx.fill();
    ctx.strokeStyle = wheelAccent;
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Facing arrow indicator
  const arrowAngles: Record<RoverFacing, number> = {
    FRONT: -Math.PI / 4,
    RIGHT: Math.PI / 4,
    BACK: (3 * Math.PI) / 4,
    LEFT: (-3 * Math.PI) / 4,
  };
  const angle = arrowAngles[facing];
  ctx.save();
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -bh / 2 - 26);
  ctx.lineTo(-3, -bh / 2 - 20);
  ctx.lineTo(3, -bh / 2 - 20);
  ctx.closePath();
  ctx.fillStyle = batteryColor;
  ctx.fill();
  ctx.restore();

  // ── ACTIVE DRILL RIG & VFX ──
  if (isDrilling) {
    // Heavy pneumatic drill shaft extending into the rock
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#94a3b8";
    ctx.beginPath();
    ctx.moveTo(0, -bh / 2 + 6);
    ctx.lineTo(0, 10);
    ctx.stroke();

    // High-speed spinning drill bit flutes
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#e2e8f0";
    const drillPhase = (time * 0.05) % 6;
    for (let d = -2; d <= 8; d += 3) {
      const yPos = d + drillPhase;
      if (yPos >= -2 && yPos <= 10) {
        ctx.beginPath();
        ctx.moveTo(-3, yPos);
        ctx.lineTo(3, yPos + 1.5);
        ctx.stroke();
      }
    }

    // Diamond cone tip & impact flare
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-3, 8);
    ctx.lineTo(3, 8);
    ctx.lineTo(0, 13);
    ctx.closePath();
    ctx.fill();

    // Intense impact glow flare
    const flareGrad = ctx.createRadialGradient(0, 12, 0, 0, 12, 10);
    flareGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    flareGrad.addColorStop(0.4, "rgba(255, 180, 50, 0.7)");
    flareGrad.addColorStop(1, "transparent");
    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.arc(0, 12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Expanding ground shockwave ripple
    const waveR = 8 + (progress * 20) % 20;
    const waveA = Math.max(0, 1 - waveR / 28);
    ctx.strokeStyle = `rgba(255, 200, 100, ${waveA})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 12, waveR, waveR * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Mineral-tinted spark & shard fountain
    const sparkColor = lastDrillResult
      ? MINERAL_METAS[lastDrillResult.type]?.color || "#00ffaa"
      : "#ffb700";

    ctx.fillStyle = sparkColor;
    ctx.shadowBlur = 8;
    ctx.shadowColor = sparkColor;

    for (let i = 0; i < 10; i++) {
      const pAngle = (i * Math.PI * 2) / 10 + (time * 0.003);
      const pDist = 8 + ((time * 0.06 + i * 5) % 22);
      const px = Math.cos(pAngle) * pDist;
      const py = 12 - Math.sin((pDist / 22) * Math.PI) * 14 + Math.sin(pAngle) * (pDist * 0.4);
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dust puffs
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(196, 149, 106, 0.35)";
    for (let i = 0; i < 4; i++) {
      const dustX = (Math.sin(time * 0.01 + i * 2) * 16);
      const dustY = 10 + (Math.cos(time * 0.01 + i * 1.5) * 4);
      ctx.beginPath();
      ctx.arc(dustX, dustY, 4 + i, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── FLOATING HARVEST POPUP ──
  if (lastDrillResult && isDrilling) {
    const meta = MINERAL_METAS[lastDrillResult.type];
    const floatY = -bh / 2 - 32 - progress * 14;
    const text = lastDrillResult.amount > 0
      ? `+${lastDrillResult.amount} ${meta.shortName}`
      : "No Yield";

    ctx.save();
    ctx.font = "bold 11px system-ui, sans-serif";
    const textWidth = ctx.measureText(text).width;
    const padX = 8;
    const pillW = textWidth + padX * 2 + 14;
    const pillH = 20;

    // Glass pill background
    ctx.beginPath();
    ctx.roundRect(-pillW / 2, floatY - pillH / 2, pillW, pillH, 10);
    ctx.fillStyle = "rgba(10, 15, 25, 0.88)";
    ctx.fill();
    ctx.strokeStyle = meta.color;
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = meta.glowColor;
    ctx.stroke();

    // Icon + text
    ctx.fillStyle = meta.color;
    ctx.shadowBlur = 4;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${meta.icon} ${text}`, 0, floatY);

    ctx.restore();
  }

  ctx.restore();
}

// ── Component ──────────────────────────────────────────────────────────────

interface IsometricGridProps {
  roverState: RoverState;
  isPlaying: boolean;
  progress: number;
  currentAction?: RoverAction | null;
}

export default function IsometricGrid({
  roverState,
  isPlaying,
  progress,
  currentAction,
}: IsometricGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<Array<{ col: number; row: number }>>([]);
  const prevPosRef = useRef({ col: roverState.col, row: roverState.row });
  const rafRef = useRef<number | null>(null);

  // Pan and Zoom camera state for 9x9 exploration
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Track trail (keep up to 32 historical steps across 9x9 sector)
  useEffect(() => {
    const prev = prevPosRef.current;
    if (prev.col !== roverState.col || prev.row !== roverState.row) {
      trailRef.current = [
        ...trailRef.current.slice(-32),
        { col: prev.col, row: prev.row },
      ];
      prevPosRef.current = { col: roverState.col, row: roverState.row };
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

    // Space background (stays static in cosmic space)
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
    bgGrad.addColorStop(0, "#0d1523");
    bgGrad.addColorStop(1, "#07090f");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Starfield
    const stars = [
      [w * 0.1, h * 0.1, 1], [w * 0.9, h * 0.08, 1.5], [w * 0.5, h * 0.05, 1],
      [w * 0.2, h * 0.15, 0.8], [w * 0.8, h * 0.2, 1.2], [w * 0.15, h * 0.9, 1],
      [w * 0.95, h * 0.85, 0.7], [w * 0.7, h * 0.92, 1], [w * 0.4, h * 0.03, 1.3],
      [w * 0.6, h * 0.95, 0.9],
    ];
    stars.forEach(([sx, sy, r]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
    });

    // ── Planetary Surface World Transform ──
    // Center of 9x9 grid is at row 4, col 4
    const originX = w / 2 - TILE_W / 2;
    const originY = h / 2 - ((GRID_SIZE - 1) / 2) * TILE_H;

    const gridW = GRID_SIZE * TILE_W;
    const gridH = GRID_SIZE * TILE_H + 40;
    const padding = 36;
    const autoScale = Math.min(1.0, Math.max(0.4, Math.min((w - padding) / gridW, (h - padding) / gridH)));
    const totalScale = autoScale * zoom;

    ctx.save();
    ctx.translate(w / 2 + pan.x, h / 2 + pan.y);
    ctx.scale(totalScale, totalScale);
    ctx.translate(-w / 2, -h / 2);

    // Drilled holes map lookup
    const holesMap = new Map<string, number>();
    for (const hItem of roverState.drilledHoles) {
      holesMap.set(getDepositKey(hItem.col, hItem.row), hItem.count);
    }

    // Draw all 9x9 tiles (Painter's sort: back to front)
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = MAP[r][c];
        const { x: sx, y: sy } = isoToScreen(c, r, originX, originY, tile.elevation);
        const onTrail = trailRef.current.some((t) => t.col === c && t.row === r);
        const isRoverPos = c === roverState.col && r === roverState.row;

        const depKey = getDepositKey(c, r);
        const deposit = roverState.deposits[depKey];
        const drilledCount = holesMap.get(depKey);

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
          time
        );
      }
    }

    // Interpolate rover position for smooth animation
    const prev = prevPosRef.current;
    const { x: prevSx, y: prevSy } = isoToScreen(prev.col, prev.row, originX, originY);
    const { x: curSx, y: curSy } = isoToScreen(roverState.col, roverState.row, originX, originY);

    const lerpX = prevSx + (curSx - prevSx) * progress;
    const lerpY = prevSy + (curSy - prevSy) * progress;

    const roverTile = MAP[roverState.row]?.[roverState.col] ?? MAP[0][0];
    const isDrillingAction = currentAction?.action === "DRILL" || roverState.isDrilling;

    drawRover(
      ctx,
      lerpX,
      lerpY - roverTile.elevation * 4,
      roverState.facing,
      roverState.battery,
      isDrillingAction,
      progress,
      time,
      roverState.lastDrillResult
    );

    ctx.restore();
  }, [roverState, progress, currentAction, zoom, pan]);

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
    const obs = new ResizeObserver(() => { draw(performance.now()); });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  // Mouse drag & zoom handlers for map exploration
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
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
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prev) => Math.min(2.5, Math.max(0.45, Number((prev * factor).toFixed(2)))));
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(0.45, Number((prev - 0.15).toFixed(2))));
  };

  const handleResetView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
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
      x: (w / 2) - roverCenterX,
      y: (h / 2) - roverCenterY,
    });
  };

  // Check deposit under rover
  const currentTileDeposit = roverState.deposits[getDepositKey(roverState.col, roverState.row)];

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      {/* Top Left: Sector & Exploration Badge */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 12px",
          borderRadius: "var(--radius-md)",
          background: "rgba(7,9,15,0.85)",
          border: "1px solid var(--space-border)",
          fontFamily: "var(--font-code)",
          fontSize: 11,
          color: "var(--text-secondary)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          pointerEvents: "none",
        }}
      >
        <span style={{ color: "var(--mars-orange)", fontWeight: 700 }}>🗺 Sector 9×9</span>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
        <span>81 Surface Tiles</span>
      </div>

      {/* Bottom Left: Coordinate & Subsurface Sensor overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 12px",
          borderRadius: "var(--radius-md)",
          background: "rgba(7,9,15,0.85)",
          border: "1px solid var(--space-border)",
          fontFamily: "var(--font-code)",
          fontSize: 11,
          color: "var(--glow-cyan)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          pointerEvents: "none",
        }}
      >
        <span>
          ({roverState.col}, {roverState.row}) · {roverState.facing}
        </span>
        {currentTileDeposit && !currentTileDeposit.depleted && (
          <span
            style={{
              padding: "1px 6px",
              borderRadius: 3,
              background: MINERAL_METAS[currentTileDeposit.type].bgRgba,
              border: `1px solid ${MINERAL_METAS[currentTileDeposit.type].color}`,
              color: MINERAL_METAS[currentTileDeposit.type].color,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {MINERAL_METAS[currentTileDeposit.type].icon}{" "}
            {MINERAL_METAS[currentTileDeposit.type].shortName} ({currentTileDeposit.remainingAmount}u)
          </span>
        )}
      </div>

      {/* Bottom Right: Map Navigation & Camera Controls */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "3px",
          borderRadius: "var(--radius-md)",
          background: "rgba(7,9,15,0.85)",
          border: "1px solid var(--space-border)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          zIndex: 5,
        }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          style={{
            width: 28,
            height: 28,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{
            width: 28,
            height: 28,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          −
        </button>
        <button
          type="button"
          onClick={handleCenterRover}
          title="Center on Rover"
          style={{
            width: 28,
            height: 28,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "var(--radius-sm)",
            color: "var(--glow-cyan)",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          🎯
        </button>
        <button
          type="button"
          onClick={handleResetView}
          title="Reset View"
          style={{
            width: 28,
            height: 28,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ⟲
        </button>
      </div>

      {/* Top Right: Playing / Action indicator */}
      {isPlaying && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: "var(--radius-md)",
            background: "rgba(7,9,15,0.85)",
            border: currentAction?.action === "DRILL"
              ? "1px solid var(--glow-amber, #ffb700)"
              : "1px solid var(--glow-green)",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: 600,
            color: currentAction?.action === "DRILL"
              ? "var(--glow-amber, #ffb700)"
              : "var(--glow-green)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: currentAction?.action === "DRILL"
                ? "var(--glow-amber, #ffb700)"
                : "var(--glow-green)",
              animation: "pulse-glow 0.8s ease-in-out infinite",
            }}
          />
          {currentAction?.action === "DRILL" ? "DRILLING CORE SAMPLE" : "EXECUTING"}
        </div>
      )}
    </div>
  );
}
