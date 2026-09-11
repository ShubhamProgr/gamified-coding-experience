"use client";

import type { RoverState } from "../Canvas/useRoverAnimation";
import { MINERAL_METAS, MineralType, getDepositKey } from "../Canvas/minerals";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          ⚡ Battery
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "var(--font-code)" }}>
          {value}%
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

function CargoBar({ current, capacity }: { current: number; capacity: number }) {
  const pct = Math.min(100, Math.round((current / capacity) * 100));
  const color = pct >= 90 ? "var(--glow-amber)" : "var(--glow-cyan)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          ⛏ Cargo Hold
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "var(--font-code)" }}>
          {current} / {capacity}
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
            background: color,
            boxShadow: `0 0 8px ${color}80`,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

export default function HUD({ roverState, totalActions, isFinished }: HUDProps) {
  const { battery, minerals, scans, col, row, actionIndex, inventory, cargoCapacity, isDrilling } = roverState;
  const actionsCompleted = Math.max(0, actionIndex + 1);

  // Current tile deposit check
  const currentDeposit = roverState.deposits[getDepositKey(col, row)];

  const mineralTypes: MineralType[] = ["lithium", "xenocryst", "titanium", "hematite"];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "12px",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Mission status banner */}
      <div
        style={{
          padding: "7px 10px",
          borderRadius: "var(--radius-md)",
          background: isFinished
            ? "rgba(0,255,136,0.08)"
            : isDrilling
            ? "rgba(255,183,0,0.12)"
            : "rgba(0,212,255,0.06)",
          border: `1px solid ${
            isFinished
              ? "rgba(0,255,136,0.25)"
              : isDrilling
              ? "rgba(255,183,0,0.4)"
              : "rgba(0,212,255,0.15)"
          }`,
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <span style={{ fontSize: 13 }}>{isFinished ? "✓" : isDrilling ? "⛏" : "◈"}</span>
        <div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: isFinished
                ? "var(--glow-green)"
                : isDrilling
                ? "var(--glow-amber)"
                : "var(--glow-cyan)",
            }}
          >
            {isFinished ? "Mission Complete" : isDrilling ? "Core Drilling" : "Mission Active"}
          </div>
          <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
            {totalActions > 0
              ? `${actionsCompleted} / ${totalActions} actions`
              : "Awaiting commands"}
          </div>
        </div>
      </div>

      {/* Battery & Cargo Bars */}
      <BatteryBar value={battery} />
      <CargoBar current={minerals} capacity={cargoCapacity} />

      {/* Mineral Inventory Bay */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: "8px 9px",
          borderRadius: "var(--radius-md)",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--space-border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            💎 Mineral Bay
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
            {minerals}u total
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 2 }}>
          {mineralTypes.map((type) => {
            const meta = MINERAL_METAS[type];
            const count = inventory[type] || 0;
            return (
              <div
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "5px 7px",
                  borderRadius: "var(--radius-sm)",
                  background: count > 0 ? meta.bgRgba : "rgba(255,255,255,0.015)",
                  border: `1px solid ${count > 0 ? meta.borderRgba : "var(--space-border)"}`,
                }}
                title={`${meta.name}: ${meta.description}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, overflow: "hidden" }}>
                  <span style={{ fontSize: 11, flexShrink: 0 }}>{meta.icon}</span>
                  <span style={{ fontSize: 9.5, color: count > 0 ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {meta.shortName}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "var(--font-code)",
                    color: count > 0 ? meta.color : "var(--text-muted)",
                    marginLeft: 4,
                    flexShrink: 0,
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {inventory.regolith > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "3px 6px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(196,149,106,0.08)",
              border: "1px solid rgba(196,149,106,0.25)",
              marginTop: 2,
            }}
          >
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>🪨 Regolith Samples</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#c4956a", fontFamily: "var(--font-code)" }}>
              {inventory.regolith}u
            </span>
          </div>
        )}
      </div>

      {/* Subsurface Scan & Position */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: "7px 9px",
          borderRadius: "var(--radius-md)",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--space-border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9.5, color: "var(--text-muted)" }}>◎ Grid & Scanner</span>
          <span style={{ fontFamily: "var(--font-code)", fontSize: 11, color: "var(--glow-cyan)", fontWeight: 600 }}>
            ({col}, {row})
          </span>
        </div>

        {currentDeposit && !currentDeposit.depleted ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 6px",
              borderRadius: 4,
              background: MINERAL_METAS[currentDeposit.type].bgRgba,
              border: `1px solid ${MINERAL_METAS[currentDeposit.type].borderRgba}`,
              fontSize: 9.5,
              color: MINERAL_METAS[currentDeposit.type].color,
            }}
          >
            <span>{MINERAL_METAS[currentDeposit.type].icon}</span>
            <span style={{ fontWeight: 600 }}>
              {MINERAL_METAS[currentDeposit.type].name} ({currentDeposit.remainingAmount}u)
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 9.5, color: "var(--text-muted)" }}>
            Surface terrain · Scans performed: {scans}
          </div>
        )}
      </div>

      {/* Tile Legend */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 8,
          borderTop: "1px solid var(--space-border)",
        }}
      >
        <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
          Tile Legend
        </div>
        {[
          { color: "#00ffaa", label: "Lithium Brine (⚡)" },
          { color: "#d946ef", label: "Alien Xenocryst (💎)" },
          { color: "#38bdf8", label: "Titanium Matrix (🛡)" },
          { color: "#f97316", label: "Hematite Concretion (🪐)" },
          { color: "#c4956a", label: "Martian Sand" },
          { color: "#00d4ff", label: "Lander Start Site" },
          { color: "#2a1508", label: "Drilled Borehole Crater" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: color,
                flexShrink: 0,
                boxShadow: color.startsWith("#00") || color.startsWith("#d9") || color.startsWith("#38") || color.startsWith("#f9")
                  ? `0 0 4px ${color}80`
                  : undefined,
              }}
            />
            <span style={{ fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
