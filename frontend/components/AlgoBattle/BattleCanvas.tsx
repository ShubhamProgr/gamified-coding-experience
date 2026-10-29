"use client";

import { useEffect, useRef } from "react";

import type { BattleResult, CombatEvent } from "./types";

type Robot = {
  x: number;
  y: number;
  color: string;
  glow: string;
  facing: 1 | -1;
  label: string;
};

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number
) {
  ctx.clearRect(0, 0, width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#050912");
  sky.addColorStop(0.65, "#07121d");
  sky.addColorStop(1, "#0a0d12");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(34, 211, 238, 0.09)";
  ctx.lineWidth = 1;
  const step = 30;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (let i = 0; i < 24; i += 1) {
    const px = ((i * 137.5) % width + t * 0.006 * (i % 3)) % width;
    const py = (i * 73.3) % (height * 0.55);
    const alpha = 0.18 + 0.22 * Math.sin(t * 0.001 + i);
    ctx.fillStyle = `rgba(125, 211, 252, ${alpha})`;
    ctx.fillRect(px, py, 1.4, 1.4);
  }

  const floor = ctx.createLinearGradient(0, height * 0.62, 0, height);
  floor.addColorStop(0, "rgba(14, 116, 144, 0.12)");
  floor.addColorStop(1, "rgba(2, 6, 12, 0.9)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, height * 0.62, width, height * 0.38);
}

function drawRobot(
  ctx: CanvasRenderingContext2D,
  robot: Robot,
  t: number,
  damageFlash: number
) {
  const { x, y, facing, color, glow, label } = robot;
  const bob = Math.sin(t * 0.003 + (facing === 1 ? 0 : 2)) * 3;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(facing, 1);

  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;

  ctx.fillStyle = "rgba(3, 8, 15, 0.95)";
  ctx.strokeStyle = damageFlash > 0 ? "#ff5c5c" : color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-30, -54);
  ctx.lineTo(24, -54);
  ctx.lineTo(34, -26);
  ctx.lineTo(22, 20);
  ctx.lineTo(-26, 20);
  ctx.lineTo(-36, -26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(8, 18, 30, 0.98)";
  ctx.beginPath();
  ctx.roundRect(-19, -74, 42, 26, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = glow;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(34, -52, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(18, -20);
  ctx.lineTo(48, -34);
  ctx.lineTo(56, -16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-20, -20);
  ctx.lineTo(-46, -8);
  ctx.lineTo(-40, 12);
  ctx.stroke();

  ctx.fillStyle = "rgba(0, 212, 255, 0.1)";
  ctx.fillRect(-16, -12, 32, 4);
  ctx.fillStyle = glow;
  ctx.fillRect(-16, -12, 18 + Math.sin(t * 0.004) * 6, 4);

  ctx.shadowBlur = 0;
  ctx.scale(facing, 1);
  ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
  ctx.font = "600 10px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label.toUpperCase(), 0, 42);

  ctx.restore();
}

function drawShield(
  ctx: CanvasRenderingContext2D,
  robot: Robot,
  strength: number
) {
  if (strength <= 0) return;
  ctx.save();
  ctx.strokeStyle = `rgba(0, 255, 180, ${0.22 + strength * 0.012})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(robot.x, robot.y - 26, 62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBeam(
  ctx: CanvasRenderingContext2D,
  from: Robot,
  to: Robot,
  progress: number
) {
  const startX = from.x + from.facing * 56;
  const startY = from.y - 55;
  const endX = to.x;
  const endY = to.y - 40;
  const x = startX + (endX - startX) * progress;
  const y = startY + (endY - startY) * progress;

  const gradient = ctx.createLinearGradient(startX, startY, x, y);
  gradient.addColorStop(0, from.glow);
  gradient.addColorStop(1, "#ffffff");

  ctx.save();
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 4;
  ctx.shadowColor = from.glow;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawImpact(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  life: number
) {
  if (life <= 0) return;
  ctx.save();
  for (let ring = 0; ring < 3; ring += 1) {
    const radius = (1 - life) * 70 + ring * 12;
    ctx.strokeStyle = `rgba(255, 183, 0, ${life * 0.7 - ring * 0.16})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, radius), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(255, 230, 150, ${life * 0.8})`;
  ctx.beginPath();
  ctx.arc(x, y, 6 + (1 - life) * 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function eventIsActive(
  event: CombatEvent,
  elapsed: number
): number {
  const start = Number(event.at || 0);
  if (event.type !== "attack") return 0;
  const local = (elapsed - start) / 500;
  if (local < 0 || local > 1) return 0;
  return local;
}

export default function BattleCanvas({
  result,
  active,
  onClashComplete,
}: {
  result: BattleResult | null;
  active: boolean;
  onClashComplete?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let disposed = false;
    const start = performance.now();
    let finishedNotified = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(320, rect.width);
      height = Math.max(180, rect.height);
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = (now: number) => {
      if (disposed) return;
      const elapsed = now - start;
      const currentResult = result;

      drawGrid(ctx, width, height, now);

      const p1Name = currentResult?.p1.username ?? "PLAYER 1";
      const p2Name = currentResult?.p2.username ?? "PLAYER 2";
      const left: Robot = {
        x: width * 0.23,
        y: height * 0.62,
        color: "#22d3ee",
        glow: "rgba(34, 211, 238, 0.85)",
        facing: 1,
        label: p1Name,
      };
      const right: Robot = {
        x: width * 0.77,
        y: height * 0.62,
        color: "#f97316",
        glow: "rgba(249, 115, 22, 0.85)",
        facing: -1,
        label: p2Name,
      };

      let leftFlash = 0;
      let rightFlash = 0;
      let leftImpact = 0;
      let rightImpact = 0;

      if (currentResult) {
        for (const event of currentResult.combatLog) {
          if (event.type === "attack") {
            const progress = eventIsActive(event, elapsed);
            if (progress > 0) {
              if (event.source === "p1") {
                drawBeam(ctx, left, right, progress);
                rightImpact = Math.max(rightImpact, Math.max(0, 1 - progress));
                rightFlash = Math.max(rightFlash, Math.max(0, 1 - progress));
              } else if (event.source === "p2") {
                drawBeam(ctx, right, left, progress);
                leftImpact = Math.max(leftImpact, Math.max(0, 1 - progress));
                leftFlash = Math.max(leftFlash, Math.max(0, 1 - progress));
              }
            }
          }
          if (event.type === "shield") {
            const shieldProgress = eventIsActive(
              { ...event, type: "attack" },
              elapsed
            );
            if (shieldProgress > 0) {
              const robot = event.source === "p1" ? left : right;
              ctx.save();
              ctx.strokeStyle = `rgba(0, 255, 180, ${shieldProgress.toFixed(3)})`;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(robot.x, robot.y - 26, 60 + shieldProgress * 20, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      }

      drawShield(ctx, left, currentResult?.p1.shield ?? 0);
      drawShield(ctx, right, currentResult?.p2.shield ?? 0);

      drawRobot(ctx, left, now, leftFlash);
      drawRobot(ctx, right, now, rightFlash);

      drawImpact(ctx, left.x, left.y - 45, leftImpact);
      drawImpact(ctx, right.x, right.y - 45, rightImpact);

      if (!currentResult) {
        ctx.fillStyle = "rgba(148, 163, 184, 0.55)";
        ctx.font = "600 10px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          active ? "SYNCING TELEMETRY" : "AWAITING DUELISTS",
          width / 2,
          height - 18
        );
      } else {
        const winner = currentResult.winner;
        const finishEvent = currentResult.combatLog.find(
          (event) => event.type === "finish"
        );
        const finishAt = finishEvent?.at ?? 1500;
        if (elapsed > finishAt) {
          const glow = Math.min(1, (elapsed - finishAt) / 500);
          const winnerRobot =
            winner === "p1" ? left : winner === "p2" ? right : null;
          if (winnerRobot) {
            ctx.save();
            const aura = ctx.createRadialGradient(
              winnerRobot.x,
              winnerRobot.y - 40,
              10,
              winnerRobot.x,
              winnerRobot.y - 40,
              120
            );
            aura.addColorStop(0, `${winnerRobot.color}55`);
            aura.addColorStop(1, "transparent");
            ctx.fillStyle = aura;
            ctx.globalAlpha = glow;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
          }
          if (!finishedNotified && elapsed > finishAt + 1200) {
            finishedNotified = true;
            onClashComplete?.();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [active, result, onClashComplete]);

  return (
    <div className="ab-canvas-wrap">
      <canvas ref={canvasRef} className="ab-canvas" />
      <div className="ab-canvas-caption">
        <span />
        battle feed
      </div>
    </div>
  );
}
