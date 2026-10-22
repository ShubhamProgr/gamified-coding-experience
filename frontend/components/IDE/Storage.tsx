"use client";

import type { RoverState } from "../Canvas/useRoverAnimation";
import { MINERAL_METAS, MineralType } from "../Canvas/minerals";

const MINERAL_ORDER: MineralType[] = ["cuprion", "pythorium", "javium"];

interface StorageProps {
  roverState: RoverState;
}

export default function Storage({ roverState }: StorageProps) {
  const { inventory, minerals, cargoCapacity } = roverState;

  return (
    <div
      style={{
        height: "clamp(104px, 16%, 150px)",
        flexShrink: 0,
        display: "flex",
        padding: "0 10px 10px",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#0b0f17",
          border: "1px solid var(--space-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Window Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "5px 10px",
            borderBottom: "1px solid var(--space-border)",
            background: "#0d121b",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="window-btn window-btn--red" style={{ width: 8, height: 8 }} />
              <span className="window-btn window-btn--yellow" style={{ width: 8, height: 8 }} />
              <span className="window-btn window-btn--green" style={{ width: 8, height: 8 }} />
            </span>
            <span style={{ fontSize: 10.5, color: "var(--text-secondary)", fontWeight: 500 }}>
              Storage
            </span>
          </div>

          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
            {minerals} / {cargoCapacity}
          </span>
        </div>

        {/* Cargo Hold */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 5,
            padding: "8px 12px",
            alignContent: "center",
          }}
        >
          {MINERAL_ORDER.map((type) => {
            const meta = MINERAL_METAS[type];
            const count = inventory[type];
            return (
              <div
                key={type}
                title={meta.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: meta.bgRgba,
                  border: `1px solid ${meta.borderRgba}`,
                  opacity: count > 0 ? 1 : 0.45,
                }}
              >
                <span style={{ fontSize: 10.5, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {meta.shortName}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: meta.color, fontFamily: "var(--font-code)" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
