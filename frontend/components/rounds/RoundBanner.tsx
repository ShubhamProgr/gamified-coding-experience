"use client";

import { MAX_ROUNDS, type RoundConfig } from "./roundsConfig";

interface RoundBannerProps {
  roundConfig: RoundConfig;
  cumulativeMinerals: number;
  starsEarned: number[];
  battery: number;
}

export default function RoundBanner({
  roundConfig,
  cumulativeMinerals,
  starsEarned,
  battery,
}: RoundBannerProps) {
  const pct = Math.min(100, Math.round((cumulativeMinerals / roundConfig.mineralTarget) * 100));
  const isComplete = cumulativeMinerals >= roundConfig.mineralTarget;
  const totalStars = starsEarned.reduce((sum, stars) => sum + stars, 0);

  const batteryColor =
    battery > 60
      ? "var(--glow-green)"
      : battery > 30
      ? "var(--glow-amber)"
      : "var(--glow-red)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "6px 16px",
        background: "rgba(7, 9, 15, 0.95)",
        borderBottom: `1px solid ${roundConfig.accentColor}30`,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent edge */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: roundConfig.accentColor,
          boxShadow: `0 0 12px ${roundConfig.accentColor}80`,
        }}
      />

      {/* Round badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 8, flexShrink: 0 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: `${roundConfig.accentColor}18`,
            border: `1px solid ${roundConfig.accentColor}50`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          {roundConfig.icon}
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: roundConfig.accentColor,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              lineHeight: 1.2,
            }}
          >
            {roundConfig.name}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.2 }}>
            {roundConfig.subtitle}
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 24, background: "var(--space-border)", flexShrink: 0 }} />

      {/* Objective progress */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 180 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Objective
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "var(--font-code)",
              color: isComplete ? "var(--glow-green)" : roundConfig.accentColor,
            }}
          >
            {isComplete ? "✓ Complete" : `${cumulativeMinerals} / ${roundConfig.mineralTarget}u`}
          </span>
        </div>
        <div
          style={{
            height: 5,
            borderRadius: 3,
            background: "var(--space-border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 3,
              background: isComplete ? "var(--glow-green)" : roundConfig.accentColor,
              boxShadow: `0 0 8px ${roundConfig.accentColor}80`,
              transition: "width 0.4s ease, background 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* Star total */}
      <div
        style={{
          padding: "3px 8px",
          borderRadius: 12,
          background: "rgba(255,183,0,0.08)",
          border: "1px solid rgba(255,183,0,0.25)",
          fontSize: 10,
          fontFamily: "var(--font-code)",
          fontWeight: 700,
          color: "#ffb700",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        ⭐ {totalStars}/{MAX_ROUNDS * 3}
      </div>

      <div style={{ flex: 1 }} />

      {/* Battery */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>⚡</span>
        <div
          style={{
            width: 48,
            height: 5,
            borderRadius: 3,
            background: "var(--space-border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${battery}%`,
              borderRadius: 3,
              background: batteryColor,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-code)",
            fontWeight: 700,
            color: batteryColor,
          }}
        >
          {battery}%
        </span>
      </div>
    </div>
  );
}
