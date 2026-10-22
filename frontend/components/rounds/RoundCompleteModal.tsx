"use client";

import { useEffect, useState } from "react";
import type { RoundConfig } from "./roundsConfig";
import type { RoverInventory } from "../Canvas/useRoverAnimation";
import { MINERAL_METAS } from "../Canvas/minerals";

interface RoundCompleteModalProps {
  roundConfig: RoundConfig;
  nextRoundConfig: RoundConfig;
  stars: number;           // 0-3
  cumulativeMinerals: number;
  battery: number;
  inventory: RoverInventory;
  mineralTarget: number;
  onAdvance: () => void;
  onDismiss: () => void;
}

function AnimatedStar({ delay, filled }: { delay: number; filled: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        fontSize: 38,
        transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease",
        transform: visible ? "scale(1)" : "scale(0.2)",
        opacity: visible ? 1 : 0,
        filter: filled
          ? "drop-shadow(0 0 12px #ffb700)"
          : "grayscale(1) opacity(0.25)",
      }}
    >
      ⭐
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        borderRadius: 6,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--space-border)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "var(--font-code)",
          color: color ?? "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function RoundCompleteModal({
  roundConfig,
  nextRoundConfig,
  stars,
  cumulativeMinerals,
  battery,
  inventory,
  mineralTarget,
  onAdvance,
  onDismiss,
}: RoundCompleteModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const failed = stars === 0;

  const totalInventory = Object.values(inventory).reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        transition: "opacity 0.3s ease",
        opacity: show ? 1 : 0,
      }}
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: "90vw",
          borderRadius: 16,
          background: "rgba(13, 17, 23, 0.97)",
          border: `1px solid ${failed ? "rgba(255,68,68,0.4)" : roundConfig.accentColor + "40"}`,
          boxShadow: `0 24px 64px rgba(0,0,0,0.8), 0 0 40px ${
            failed ? "rgba(255,68,68,0.15)" : roundConfig.accentColor + "20"
          }`,
          overflow: "hidden",
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: show ? "scale(1)" : "scale(0.85)",
        }}
      >
        {/* Header band */}
        <div
          style={{
            padding: "20px 24px 16px",
            background: `linear-gradient(135deg, ${roundConfig.accentColor}12, transparent)`,
            borderBottom: `1px solid ${roundConfig.accentColor}20`,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 4 }}>
            {failed ? "💀" : "🎉"}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: failed ? "var(--glow-red)" : roundConfig.accentColor,
              letterSpacing: "0.04em",
            }}
          >
            {failed ? "Mission Failed" : "Round Complete!"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
            {roundConfig.name} — {roundConfig.subtitle}
          </div>
        </div>

        {/* Stars */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            padding: "20px 0 12px",
          }}
        >
          {[1, 2, 3].map((i) => (
            <AnimatedStar key={i} delay={i * 260} filled={!failed && i <= stars} />
          ))}
        </div>

        {/* Star label */}
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          {failed
            ? "Objective not met — retry to collect more minerals"
            : stars === 3
            ? "🏆 Perfect Score — Elite Commander!"
            : stars === 2
            ? "💪 Solid Execution — Well done!"
            : "✅ Objective Met — Keep improving!"}
        </div>

        {/* Stats */}
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 6 }}>
          <StatRow
            icon="⛏"
            label="Cumulative Minerals"
            value={`${cumulativeMinerals}u / ${mineralTarget}u`}
            color={cumulativeMinerals >= mineralTarget ? "var(--glow-green)" : "var(--glow-red)"}
          />
          <StatRow
            icon="⚡"
            label="Battery Remaining"
            value={`${battery}%`}
            color={battery > 50 ? "var(--glow-green)" : battery > 25 ? "var(--glow-amber)" : "var(--glow-red)"}
          />
          {/* Inventory summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 5,
              marginTop: 2,
            }}
          >
            {(["cuprion", "pythorium", "javium"] as const).map((type) => {
              const meta = MINERAL_METAS[type];
              const count = inventory[type] || 0;
              return (
                <div
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: count > 0 ? meta.bgRgba : "rgba(255,255,255,0.02)",
                    border: `1px solid ${count > 0 ? meta.borderRgba : "var(--space-border)"}`,
                  }}
                >
                  <span style={{ fontSize: 11, color: count > 0 ? meta.color : "var(--text-muted)" }}>
                    {meta.icon} {meta.shortName}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "var(--font-code)",
                      color: count > 0 ? meta.color : "var(--text-muted)",
                    }}
                  >
                    {count}u
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carry-over notice */}
        <div
          style={{
            margin: "14px 20px 0",
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(0,212,255,0.07)",
            border: "1px solid rgba(0,212,255,0.2)",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>🔗</span>
          <span style={{ fontSize: 10.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            <b style={{ color: "var(--glow-cyan)" }}>Carry-over:</b> Your {battery}% battery
            and {totalInventory}u cargo will persist into {nextRoundConfig.name}.
            Manage them wisely!
          </span>
        </div>

        {/* Next round preview */}
        <div
          style={{
            margin: "10px 20px 0",
            padding: "8px 12px",
            borderRadius: 8,
            background: `${nextRoundConfig.accentColor}0d`,
            border: `1px solid ${nextRoundConfig.accentColor}30`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>{nextRoundConfig.icon}</span>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: nextRoundConfig.accentColor,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Up Next: {nextRoundConfig.name} — {nextRoundConfig.subtitle}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              Target: {nextRoundConfig.mineralTarget}u cumulative
              {nextRoundConfig.radiationZones.length > 0 &&
                ` · ${nextRoundConfig.radiationZones.length} radiation zones`}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "16px 20px 20px",
            marginTop: 4,
          }}
        >
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onDismiss}
            style={{ flex: 1, justifyContent: "center" }}
          >
            ↺ Retry Round
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onAdvance}
            style={{ flex: 2, justifyContent: "center", fontSize: 13 }}
          >
            {nextRoundConfig.name} → Continue
          </button>
        </div>
      </div>
    </div>
  );
}
