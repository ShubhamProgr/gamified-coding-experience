"use client";

import type { RoverState } from "../Canvas/useRoverAnimation";

interface HUDProps {
  roverState: RoverState;
  totalActions: number;
  isFinished: boolean;
}

function BatteryBar({ value }: { value: number }) {
  const color =
    value > 60 ? "var(--glow-green)" :
    value > 30 ? "var(--glow-amber)" :
    "var(--glow-red)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          ⚡ Battery
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "var(--font-code)" }}>
          {value}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: "var(--space-border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            borderRadius: 3,
            background: color,
            boxShadow: `0 0 8px ${color}80`,
            transition: "width 0.3s ease, background 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color = "var(--text-primary)",
}: {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "8px 10px",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--space-border)",
        flex: 1,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-ui)", whiteSpace: "nowrap" }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "var(--font-code)" }}>
        {value}
      </span>
    </div>
  );
}

export default function HUD({ roverState, totalActions, isFinished }: HUDProps) {
  const { battery, minerals, scans, col, row, actionIndex } = roverState;
  const actionsCompleted = Math.max(0, actionIndex + 1);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "14px",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Mission status banner */}
      <div
        style={{
          padding: "8px 12px",
          borderRadius: "var(--radius-md)",
          background: isFinished
            ? "rgba(0,255,136,0.08)"
            : "rgba(0,212,255,0.06)",
          border: `1px solid ${isFinished ? "rgba(0,255,136,0.25)" : "rgba(0,212,255,0.15)"}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>{isFinished ? "✓" : "◈"}</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: isFinished ? "var(--glow-green)" : "var(--glow-cyan)" }}>
            {isFinished ? "Mission Complete" : "Mission Active"}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
            {totalActions > 0
              ? `${actionsCompleted} / ${totalActions} actions`
              : "Awaiting commands"}
          </div>
        </div>
      </div>

      {/* Battery */}
      <BatteryBar value={battery} />

      {/* Stats */}
      <div style={{ display: "flex", gap: 6 }}>
        <StatCard
          icon="⛏"
          label="Minerals"
          value={minerals}
          color="var(--glow-amber)"
        />
        <StatCard
          icon="◉"
          label="Scans"
          value={scans}
          color="var(--glow-purple)"
        />
      </div>

      {/* Position */}
      <div
        style={{
          padding: "8px 10px",
          borderRadius: "var(--radius-md)",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--space-border)",
        }}
      >
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
          ◎ Grid Position
        </div>
        <div style={{ fontFamily: "var(--font-code)", fontSize: 14, color: "var(--glow-cyan)", fontWeight: 600 }}>
          ({col}, {row})
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 10,
          borderTop: "1px solid var(--space-border)",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
          Tile Legend
        </div>
        {[
          { color: "#c4956a", label: "Sand" },
          { color: "#9a7255", label: "Rock" },
          { color: "#5a3a25", label: "Dark Rock" },
          { color: "#4a8a6a", label: "Mineral Deposit" },
          { color: "#00d4ff", label: "Start Position" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
