"use client";

import { useState } from "react";
import {
  BUILDINGS,
  Building,
  BuildingType,
  canAfford,
} from "./buildingsConfig";
import { MINERAL_METAS, MineralType } from "../Canvas/minerals";
import type { RoverInventory } from "../Canvas/useRoverAnimation";

const COST_ORDER: MineralType[] = ["cuprion", "pythorium", "javium"];

interface BuildPanelProps {
  round: number;
  inventory: RoverInventory;
  buildings: Building[];
  placing: BuildingType | null;
  error: string | null;
  busy?: boolean;
  onStartPlacement: (type: BuildingType) => void;
  onCancelPlacement: () => void;
}

export default function BuildPanel({
  round,
  inventory,
  buildings,
  placing,
  error,
  busy = false,
  onStartPlacement,
  onCancelPlacement,
}: BuildPanelProps) {
  const [open, setOpen] = useState(false);

  const def = BUILDINGS.charging_station;
  const stationCount = buildings.filter((b) => b.type === "charging_station").length;
  const affordable = canAfford(inventory, def.cost);
  const canPlace = affordable && !busy;
  const hasNewUnlock = round >= def.unlockRound && stationCount === 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        pointerEvents: "auto",
      }}
    >
      {open && (
        <div
          style={{
            width: 268,
            background: "rgba(7,9,15,0.94)",
            border: "1px solid var(--space-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 12px",
              borderBottom: "1px solid var(--space-border)",
              background: "rgba(0,212,255,0.05)",
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--glow-cyan)",
              }}
            >
              Construction
            </span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (placing) onCancelPlacement();
              }}
              aria-label="Close build panel"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 14,
                cursor: "pointer",
                lineHeight: 1,
                padding: 2,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Building card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "10px",
                borderRadius: "var(--radius-md)",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--space-border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(0,212,255,0.12)",
                    border: "1px solid rgba(0,212,255,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  {def.icon}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                    {def.name}
                  </div>
                  <div style={{ fontSize: 9.5, color: "var(--text-muted)" }}>
                    {def.effect}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 10, lineHeight: 1.45, color: "var(--text-secondary)" }}>
                {def.description}
              </div>

              {/* Cost chips */}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {COST_ORDER.filter((type) => (def.cost[type] ?? 0) > 0).map((type) => {
                  const meta = MINERAL_METAS[type];
                  const need = def.cost[type];
                  const have = inventory[type];
                  const enough = have >= need;
                  return (
                    <span
                      key={type}
                      title={`${meta.name}: ${have} available / ${need} required`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 6px",
                        borderRadius: 10,
                        fontSize: 9.5,
                        fontWeight: 600,
                        fontFamily: "var(--font-code)",
                        color: enough ? meta.color : "var(--glow-red)",
                        background: enough ? meta.bgRgba : "rgba(255,68,68,0.08)",
                        border: `1px solid ${enough ? meta.borderRgba : "rgba(255,68,68,0.3)"}`,
                      }}
                    >
                      <span>{meta.icon}</span>
                      {have}/{need}
                    </span>
                  );
                })}
              </div>

              {placing === def.type ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--glow-cyan)",
                      background: "rgba(0,212,255,0.08)",
                      border: "1px dashed rgba(0,212,255,0.4)",
                      borderRadius: "var(--radius-sm)",
                      padding: "5px 7px",
                    }}
                  >
                    Click a highlighted terrain tile to place the station. Press Esc to cancel.
                  </div>
                  <button
                    type="button"
                    onClick={onCancelPlacement}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--space-border)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-ui)",
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: "5px 8px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel placement
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartPlacement(def.type)}
                  disabled={!canPlace}
                  style={{
                    background: canPlace ? "rgba(0,212,255,0.14)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${canPlace ? "rgba(0,212,255,0.5)" : "var(--space-border)"}`,
                    borderRadius: "var(--radius-sm)",
                    color: canPlace ? "var(--glow-cyan)" : "var(--text-muted)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "6px 8px",
                    cursor: canPlace ? "pointer" : "not-allowed",
                  }}
                >
                  {busy
                    ? "Wait for the run to finish"
                    : affordable
                    ? "Place on map"
                    : "Not enough minerals"}
                </button>
              )}

              {error && (
                <div style={{ fontSize: 9.5, color: "var(--glow-red)" }}>{error}</div>
              )}
            </div>

            <div style={{ fontSize: 9.5, color: "var(--text-muted)" }}>
              Built: {stationCount} · Charging works when the rover is on or next to a station.
            </div>
          </div>
        </div>
      )}

      {/* Toggle pill */}
      <button
        type="button"
        onClick={() => {
          if (open && placing) onCancelPlacement();
          setOpen((v) => !v);
        }}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "7px 12px",
          borderRadius: 20,
          background: open ? "rgba(0,212,255,0.18)" : "rgba(7,9,15,0.92)",
          border: "1px solid rgba(0,212,255,0.4)",
          color: "var(--glow-cyan)",
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
        }}
      >
        <span style={{ fontSize: 13 }}>🏗</span>
        Build
        {stationCount > 0 && (
          <span
            style={{
              fontSize: 9,
              padding: "1px 5px",
              borderRadius: 8,
              background: "rgba(0,212,255,0.18)",
              color: "var(--glow-cyan)",
              fontFamily: "var(--font-code)",
            }}
          >
            {stationCount}
          </span>
        )}
        {hasNewUnlock && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: "0.06em",
              padding: "2px 5px",
              borderRadius: 8,
              background: "var(--glow-amber)",
              color: "#1a1200",
              boxShadow: "0 0 10px rgba(255,183,0,0.7)",
            }}
          >
            NEW
          </span>
        )}
      </button>
    </div>
  );
}
