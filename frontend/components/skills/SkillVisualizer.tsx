"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { SkillId } from "./skillsConfig";

const CELL = 42;
const GRID = 5;
const SIZE = CELL * GRID;

function getMode(id: SkillId): "decision" | "loop" | "grid" {
  if (id === "if-else" || id === "autonomy") return "decision";
  if (
    id === "for-loop" ||
    id === "while-loop" ||
    id === "loop-control" ||
    id === "automation"
  ) {
    return "loop";
  }
  return "grid";
}

const ACTION_LABELS: Partial<Record<SkillId, string>> = {
  drive: 'rover.drive("FRONT")',
  drill: "rover.drill()",
  scan: "rover.scan()",
  turn: "rover.turn_right()",
  charge: "rover.charge(20)",
  navigator: "drive → turn → drive",
  surveyor: "scan → drill",
};

const LOOP_LABELS: Partial<Record<SkillId, string[]>> = {
  "for-loop": ["Start", "i < 3?", "drive + drill", "i++"],
  "while-loop": ["Start", "condition?", "rover.drill()", "update"],
  "loop-control": ["Enter loop", "i == 3?", "break", "skip"],
  automation: ["Start loop", "next item", "rover command", "repeat"],
};

export default function SkillVisualizer({ skillId }: { skillId: SkillId }) {
  const mode = getMode(skillId);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const cycle = mode === "decision" ? 3 : 4;
    const timer = setInterval(() => setStep((s) => (s + 1) % cycle), 900);
    return () => clearInterval(timer);
  }, [mode]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {mode === "decision" && <DecisionVisual step={step} />}
      {mode === "loop" && <LoopVisual skillId={skillId} step={step} />}
      {mode === "grid" && <RoverVisual skillId={skillId} step={step} />}

      <div
        style={{
          fontSize: 10,
          fontFamily: "var(--font-code)",
          color: "var(--text-muted)",
        }}
      >
        {mode === "grid"
          ? ACTION_LABELS[skillId] ?? "live preview"
          : mode === "loop"
            ? "loop cycle"
            : "branch path"}
      </div>
    </div>
  );
}

function FlowNode({
  children,
  active,
  style,
}: {
  children: ReactNode;
  active: boolean;
  style: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "6px 8px",
        borderRadius: 8,
        fontFamily: "var(--font-code)",
        fontSize: 9.5,
        lineHeight: 1.35,
        background: active ? "rgba(0,255,136,0.12)" : "var(--space-surface)",
        border: `1px solid ${
          active ? "rgba(0,255,136,0.5)" : "var(--space-border)"
        }`,
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        boxShadow: active ? "0 0 14px rgba(0,255,136,0.12)" : "none",
        transition: "all 0.3s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function DecisionVisual({ step }: { step: number }) {
  const active = step % 3;

  return (
    <div style={{ position: "relative", width: 280, height: 200 }}>
      <svg
        width={280}
        height={200}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <path
          d="M140 62 L140 86 M60 86 L220 86 M60 86 L60 112 M220 86 L220 112"
          fill="none"
          stroke="rgba(120,150,180,0.35)"
          strokeWidth={1.5}
        />
        <path
          d={
            active === 1
              ? "M140 62 L140 86 L60 86 L60 112"
              : active === 2
                ? "M140 62 L140 86 L220 86 L220 112"
                : "M140 62 L140 86"
          }
          fill="none"
          stroke="rgba(0,255,136,0.7)"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ transition: "all 0.3s ease" }}
        />
      </svg>

      <FlowNode
        active={active === 0}
        style={{ left: 92, top: 20, width: 96, height: 42 }}
      >
        battery &gt; 25?
      </FlowNode>

      <FlowNode
        active={active === 1}
        style={{ left: 6, top: 112, width: 108, height: 56 }}
      >
        true → rover.drive()
      </FlowNode>

      <FlowNode
        active={active === 2}
        style={{ left: 166, top: 112, width: 108, height: 56 }}
      >
        false → rover.charge()
      </FlowNode>

      <span
        style={{
          position: "absolute",
          left: 64,
          top: 72,
          fontSize: 8,
          color: "var(--glow-green)",
          fontFamily: "var(--font-code)",
        }}
      >
        true
      </span>
      <span
        style={{
          position: "absolute",
          left: 198,
          top: 72,
          fontSize: 8,
          color: "var(--text-muted)",
          fontFamily: "var(--font-code)",
        }}
      >
        false
      </span>
    </div>
  );
}

function LoopVisual({ skillId, step }: { skillId: SkillId; step: number }) {
  const labels = LOOP_LABELS[skillId] ?? [
    "Start",
    "condition?",
    "rover command",
    "repeat",
  ];
  const active = step % 4;

  const center = 135;
  const radius = 92;
  const angle = ((step * 90 - 90) * Math.PI) / 180;
  const dotX = center + radius * Math.cos(angle);
  const dotY = center + radius * Math.sin(angle);

  const positions: CSSProperties[] = [
    { left: 83, top: 4, width: 104, height: 30 },
    { left: 166, top: 119, width: 104, height: 30 },
    { left: 83, top: 232, width: 104, height: 30 },
    { left: 0, top: 119, width: 104, height: 30 },
  ];

  return (
    <div style={{ position: "relative", width: 270, height: 270 }}>
      <svg
        width={270}
        height={270}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(120,150,180,0.28)"
          strokeWidth={1.5}
          strokeDasharray="4 7"
        />
        <circle
          cx={dotX}
          cy={dotY}
          r={4}
          fill="var(--glow-green)"
          style={{
            transition: "cx 0.7s linear, cy 0.7s linear",
            filter: "drop-shadow(0 0 4px rgba(0,255,136,0.8))",
          }}
        />
      </svg>

      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 270,
          height: 270,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          opacity: 0.35,
        }}
      >
        🔄
      </span>

      {labels.map((label, i) => (
        <FlowNode key={label} active={active === i} style={positions[i]}>
          {label}
        </FlowNode>
      ))}
    </div>
  );
}

const DRIVE_PATH = [
  [2, 4],
  [2, 3],
  [2, 2],
  [2, 1],
];

const NAV_PATH = [
  [0, 4],
  [0, 3],
  [1, 3],
  [2, 3],
];

function RoverVisual({ skillId, step }: { skillId: SkillId; step: number }) {
  const isNavigator = skillId === "navigator";
  const isDrive = skillId === "drive";
  const isTurn = skillId === "turn";
  const isScan = skillId === "scan" || skillId === "surveyor";
  const isDrill = skillId === "drill" || skillId === "surveyor";
  const isCharge = skillId === "charge";

  const path = isNavigator ? NAV_PATH : isDrive ? DRIVE_PATH : null;
  const [col, row] = path ? path[step] : [2, 2];
  const rotation = isTurn ? step * 90 : 0;
  const trail = path ? path.slice(0, step) : [];

  const centerX = col * CELL + CELL / 2;
  const centerY = row * CELL + CELL / 2;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        style={{
          position: "relative",
          width: SIZE,
          height: SIZE,
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          background: "#05070b",
          border: "1px solid var(--space-border)",
          backgroundImage:
            "linear-gradient(to right, rgba(30,45,66,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,45,66,0.55) 1px, transparent 1px)",
          backgroundSize: `${CELL}px ${CELL}px`,
        }}
      >
        {trail.map(([c, r]) => (
          <span
            key={`${c}-${r}`}
            style={{
              position: "absolute",
              left: c * CELL + CELL / 2 - 2,
              top: r * CELL + CELL / 2 - 2,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "rgba(0,212,255,0.45)",
            }}
          />
        ))}

        {isScan && (
          <>
            {[0, 1].map((i) => {
              const ringSize = 14 + step * 12 + i * 12;
              return (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left: centerX,
                    top: centerY,
                    width: ringSize,
                    height: ringSize,
                    marginLeft: -ringSize / 2,
                    marginTop: -ringSize / 2,
                    borderRadius: "50%",
                    border: "1px solid rgba(0,212,255,0.55)",
                    opacity: Math.max(0, 0.85 - step * 0.2 - i * 0.2),
                    transition: "all 0.6s ease",
                  }}
                />
              );
            })}
          </>
        )}

        {isDrill && (
          <span
            style={{
              position: "absolute",
              left: centerX,
              top: centerY,
              width: 18 + step * 9,
              height: 18 + step * 9,
              marginLeft: -(18 + step * 9) / 2,
              marginTop: -(18 + step * 9) / 2,
              borderRadius: "50%",
              border: "1px solid rgba(255,183,0,0.55)",
              opacity: Math.max(0, 0.9 - step * 0.2),
              transition: "all 0.6s ease",
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            left: col * CELL,
            top: row * CELL,
            width: CELL,
            height: CELL,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "left 0.5s ease, top 0.5s ease",
          }}
        >
          <div
            style={{
              position: "relative",
              width: CELL,
              height: CELL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `rotate(${rotation}deg)`,
              transition: "transform 0.5s ease",
            }}
          >
            <span style={{ fontSize: 17 }}>🤖</span>
            <span
              style={{
                position: "absolute",
                top: 0,
                fontSize: 7,
                color: "var(--glow-cyan)",
              }}
            >
              ▲
            </span>
          </div>
        </div>

        {isDrill && step >= 2 && (
          <span
            style={{
              position: "absolute",
              left: centerX + 8,
              top: centerY + 8,
              fontSize: 10,
              color: "var(--glow-amber)",
              transition: "opacity 0.4s ease",
            }}
          >
            ◆+10
          </span>
        )}

        {isCharge && (
          <>
            <span
              style={{
                position: "absolute",
                left: centerX + 10,
                top: centerY - 22,
                fontSize: 12,
                color: "var(--glow-green)",
              }}
            >
              ⚡
            </span>
            <div
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 10,
                height: 6,
                borderRadius: 3,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(step + 1) * 25}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: "var(--glow-green)",
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
