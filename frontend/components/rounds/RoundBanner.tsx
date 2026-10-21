"use client";

import { MAX_ROUNDS, type RoundConfig } from "./roundsConfig";

interface RoundBannerProps {
  roundConfig: RoundConfig;
  cumulativeMinerals: number;
  currentRoundMinerals: number;
  starsEarned: number[];
  battery: number;
}

function StarRow({
  starsEarned,
  currentRound,
}: {
  starsEarned: number[];
  currentRound: number;
}) {
  const totalStars = starsEarned.reduce((sum, stars) => sum + stars, 0);
  const currentStars = starsEarned[currentRound - 1] ?? 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "2px 7px",
          borderRadius: 12,
          background:
            currentStars > 0
              ? "rgba(255,183,0,0.15)"
              : "rgba(255,255,255,0.04)",
          border: `1px solid ${currentStars > 0 ? "rgba(255,183,0,0.4)" : "var(--space-border)"}`,
          fontSize: 10,
          fontFamily: "var(--font-code)",
          fontWeight: 700,
          color: currentStars > 0 ? "#ffb700" : "var(--text-muted)",
          transition: "all 0.3s ease",
        }}
      >
        <span style={{ fontSize: 9 }}>R{currentRound}</span>
        <span>{currentStars > 0 ? "⭐".repeat(currentStars) : "—"}</span>
      </div>
      <div
        style={{
          padding: "2px 7px",
          borderRadius: 12,
          background: "rgba(255,183,0,0.08)",
          border: "1px solid rgba(255,183,0,0.25)",
          fontSize: 10,
          fontFamily: "var(--font-code)",
          fontWeight: 700,
          color: "#ffb700",
          whiteSpace: "nowrap",
        }}
      >
        ⭐ {totalStars}/{MAX_ROUNDS * 3}
      </div>
    </div>
  );
}

export default function RoundBanner({
  roundConfig,
  cumulativeMinerals,
  currentRoundMinerals,
  starsEarned,
  battery,
}: RoundBannerProps) {
  const pct = Math.min(100, Math.round((cumulativeMinerals / roundConfig.mineralTarget) * 100));
  const remaining = Math.max(0, roundConfig.mineralTarget - cumulativeMinerals);
  const isComplete = cumulativeMinerals >= roundConfig.mineralTarget;
  const hasRadiation = roundConfig.radiationZones.length > 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 16px",
        background: "rgba(7, 9, 15, 0.95)",
        borderBottom: `1px solid ${roundConfig.accentColor}30`,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent gradient edge */}
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          paddingLeft: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: `${roundConfig.accentColor}18`,
            border: `1.5px solid ${roundConfig.accentColor}60`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            boxShadow: `0 0 10px ${roundConfig.accentColor}30`,
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
              letterSpacing: "0.08em",
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

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: "var(--space-border)", flexShrink: 0 }} />

      {/* Objective: mineral progress */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 160 }}>
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
            🎯 Objective
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "var(--font-code)",
              color: isComplete ? "var(--glow-green)" : roundConfig.accentColor,
            }}
          >
            {isComplete ? "✓ Complete!" : `${remaining}u needed`}
          </span>
        </div>
        {/* Progress bar */}
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
              background: isComplete
                ? "var(--glow-green)"
                : `linear-gradient(90deg, ${roundConfig.accentColor}cc, ${roundConfig.accentColor})`,
              boxShadow: `0 0 8px ${roundConfig.accentColor}80`,
              transition: "width 0.4s ease, background 0.4s ease",
            }}
          />
        </div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            fontFamily: "var(--font-code)",
          }}
        >
          {cumulativeMinerals}u / {roundConfig.mineralTarget}u cumulative
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: "var(--space-border)", flexShrink: 0 }} />

      {/* This run minerals */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
        <span style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          This Run
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "var(--font-code)",
            color: currentRoundMinerals > 0 ? "var(--glow-cyan)" : "var(--text-muted)",
          }}
        >
          +{currentRoundMinerals}u
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: "var(--space-border)", flexShrink: 0 }} />

      {/* Radiation zone warning */}
      {hasRadiation && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 9px",
              borderRadius: 20,
              background: "rgba(251, 113, 133, 0.1)",
              border: "1px solid rgba(251, 113, 133, 0.35)",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 11 }}>☢️</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#fb7185" }}>
              {roundConfig.radiationZones.length} Rad Zones
            </span>
          </div>
          {/* Divider */}
          <div style={{ width: 1, height: 28, background: "var(--space-border)", flexShrink: 0 }} />
        </>
      )}

      {/* Star tracker */}
      <StarRow starsEarned={starsEarned} currentRound={roundConfig.id} />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Battery mini */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
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
              background:
                battery > 60
                  ? "var(--glow-green)"
                  : battery > 30
                  ? "var(--glow-amber)"
                  : "var(--glow-red)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-code)",
            fontWeight: 700,
            color:
              battery > 60
                ? "var(--glow-green)"
                : battery > 30
                ? "var(--glow-amber)"
                : "var(--glow-red)",
          }}
        >
          {battery}%
        </span>
      </div>
    </div>
  );
}
