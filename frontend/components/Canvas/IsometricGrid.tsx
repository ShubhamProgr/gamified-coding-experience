"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { RoverState, RoverFacing } from "./useRoverAnimation";

// ── Isometric constants ────────────────────────────────────────────────────

const TILE_W = 72;
const TILE_H = 36;
const GRID_SIZE = 15;

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
  for (let r = 0; r < GRID_SIZE; r++) {
    map[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = rand();
      let type: TileType = "sand";
      if (v > 0.88) type = "darkrock";
      else if (v > 0.75) type = "rock";
      else if (v > 0.96) type = "mineral";
      if (r === 7 && c === 7) type = "start";
      map[r][c] = { type, elevation: Math.floor(rand() * 3), crackCount: Math.floor(rand() * 4) };
    }
  }
  // Scatter a few mineral deposits
  const mineralSpots = [[3, 4], [11, 9], [5, 12], [9, 2]];
  mineralSpots.forEach(([r, c]) => { map[r][c].type = "mineral"; });
  return map;
}

const MAP = generateMap();

// ── Color palettes ─────────────────────────────────────────────────────────

const TILE_COLORS: Record<TileType, { top: string; left: string; right: string }> = {
  sand:     { top: "#c4956a", left: "#a07550", right: "#8a6040" },
  rock:     { top: "#9a7255", left: "#7a5535", right: "#6a4525" },
  darkrock: { top: "#5a3a25", left: "#3a2010", right: "#2a1508" },
  mineral:  { top: "#4a8a6a", left: "#2a6a4a", right: "#1a5a3a" },
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
    y: originY + (col + row) * (TILE_H / 2) - elevation * 6,
  };
}

// ── Drawing primitives ─────────────────────────────────────────────────────

function drawTile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tile: Tile,
  highlight = false
) {
  const { top, left, right } = TILE_COLORS[tile.type];
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  const depth = 6 + tile.elevation * 3;

  // Top face (rhombus)
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + hw, sy + hh);
  ctx.lineTo(sx + TILE_W, sy);
  ctx.lineTo(sx + hw, sy - hh);
  ctx.closePath();
  if (highlight) {
    const grad = ctx.createLinearGradient(sx, sy - hh, sx + TILE_W, sy + hh);
    grad.addColorStop(0, "#00d4ff30");
    grad.addColorStop(1, top);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = top;
  }
  ctx.fill();

  // Subtle grid line on top
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 0.5;
  ctx.stroke();

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

  // Mineral shimmer
  if (tile.type === "mineral") {
    ctx.beginPath();
    ctx.moveTo(sx + hw * 0.8, sy - hh * 0.3);
    ctx.lineTo(sx + hw * 1.1, sy + hh * 0.1);
    ctx.lineTo(sx + hw, sy - hh * 0.05);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,255,136,0.45)";
    ctx.fill();
  }

  // Procedural cracks on top
  if (tile.crackCount > 0 && tile.type !== "mineral") {
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 0.7;
    for (let i = 0; i < tile.crackCount; i++) {
      const ox = sx + hw * 0.5 + (i * 18 % TILE_W);
      const oy = sy - hh * 0.2 + i * 4;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + 8 + i * 3, oy + 3 + i);
      ctx.stroke();
    }
  }

  // Start tile marker
  if (tile.type === "start") {
    ctx.beginPath();
    ctx.arc(sx + hw, sy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,212,255,0.5)";
    ctx.fill();
  }
}

function drawRover(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  facing: RoverFacing,
  battery: number
) {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  // Rover body center relative to tile top-center
  const cx = sx + hw;
  const cy = sy - 4;

  ctx.save();
  ctx.translate(cx, cy);

  // Battery glow color
  const batteryColor =
    battery > 60 ? "#00ff88" :
    battery > 30 ? "#ffb700" :
    "#ff4444";

  // Glow effect
  ctx.shadowBlur = 18;
  ctx.shadowColor = batteryColor;

  // Body (rounded rect approximation)
  const bw = 24, bh = 14;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2 - 8, bw, bh, 3);
  ctx.fillStyle = "#1e2d42";
  ctx.fill();
  ctx.strokeStyle = batteryColor;
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
  ctx.shadowBlur = 8;
  ctx.shadowColor = batteryColor;
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
    NORTH: -Math.PI / 4,
    EAST:  Math.PI / 4,
    SOUTH: (3 * Math.PI) / 4,
    WEST:  (-3 * Math.PI) / 4,
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

  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  roverCol: number,
  roverRow: number,
  trail: Array<{ col: number; row: number }>,
  animOffset: { dx: number; dy: number }
) {
  const originX = width / 2;
  const originY = height * 0.3;

  // Sort order: back to front (painter's algorithm for iso)
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = MAP[r][c];
      const { x: sx, y: sy } = isoToScreen(c, r, originX, originY, tile.elevation);

      // Check trail
      const onTrail = trail.some((t) => t.col === c && t.row === r);
      const isRover = c === roverCol && r === roverRow;

      drawTile(ctx, sx, sy, tile, onTrail && !isRover);
    }
  }

  // Draw rover with animated offset
  const { x: rsx, y: rsy } = isoToScreen(roverCol, roverRow, originX, originY);
  const roverTile = MAP[roverRow][roverCol];
  drawRover(
    ctx,
    rsx + animOffset.dx,
    rsy + animOffset.dy - roverTile.elevation * 6,
    "NORTH", // facing handled by hook
    100
  );

  return { originX, originY };
}

// ── Component ──────────────────────────────────────────────────────────────

interface IsometricGridProps {
  roverState: RoverState;
  isPlaying: boolean;
  progress: number;
}

export default function IsometricGrid({ roverState, isPlaying, progress }: IsometricGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<Array<{ col: number; row: number }>>([]);
  const prevPosRef = useRef({ col: roverState.col, row: roverState.row });
  const rafRef = useRef<number | null>(null);

  // Track trail
  useEffect(() => {
    const prev = prevPosRef.current;
    if (prev.col !== roverState.col || prev.row !== roverState.row) {
      trailRef.current = [
        ...trailRef.current.slice(-12),
        { col: prev.col, row: prev.row },
      ];
      prevPosRef.current = { col: roverState.col, row: roverState.row };
    }
  }, [roverState.col, roverState.row]);

  const draw = useCallback(() => {
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

    const originX = w / 2;
    const originY = h * 0.3;

    // Draw all tiles
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = MAP[r][c];
        const { x: sx, y: sy } = isoToScreen(c, r, originX, originY, tile.elevation);
        const onTrail = trailRef.current.some((t) => t.col === c && t.row === r);
        const isRoverPos = c === roverState.col && r === roverState.row;
        drawTile(ctx, sx, sy, tile, onTrail && !isRoverPos);
      }
    }

    // Interpolate rover position for smooth animation
    const prev = prevPosRef.current;
    const { x: prevSx, y: prevSy } = isoToScreen(prev.col, prev.row, originX, originY);
    const { x: curSx, y: curSy } = isoToScreen(roverState.col, roverState.row, originX, originY);

    const lerpX = prevSx + (curSx - prevSx) * progress;
    const lerpY = prevSy + (curSy - prevSy) * progress;

    const roverTile = MAP[roverState.row][roverState.col];
    drawRover(ctx, lerpX, lerpY - roverTile.elevation * 6, roverState.facing, roverState.battery);

  }, [roverState, progress]);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver(() => { draw(); });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      {/* Coordinate overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          padding: "4px 10px",
          borderRadius: "var(--radius-md)",
          background: "rgba(7,9,15,0.8)",
          border: "1px solid var(--space-border)",
          fontFamily: "var(--font-code)",
          fontSize: 11,
          color: "var(--glow-cyan)",
          backdropFilter: "blur(8px)",
        }}
      >
        ({roverState.col}, {roverState.row}) · {roverState.facing}
      </div>

      {/* Playing indicator */}
      {isPlaying && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: "var(--radius-md)",
            background: "rgba(7,9,15,0.8)",
            border: "1px solid var(--glow-green)",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--glow-green)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--glow-green)",
              animation: "pulse-glow 1s ease-in-out infinite",
            }}
          />
          EXECUTING
        </div>
      )}
    </div>
  );
}
