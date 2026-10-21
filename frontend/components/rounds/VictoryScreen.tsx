"use client";

import { useEffect, useState } from "react";
import type { RoverInventory } from "../Canvas/useRoverAnimation";
import { MINERAL_METAS } from "../Canvas/minerals";
import { MAX_ROUNDS, ROUNDS } from "./roundsConfig";

interface VictoryScreenProps {
  starsEarned: number[];
  cumulativeMinerals: number;
  inventory: RoverInventory;
  battery: number;
  onRestart: () => void;
}

function Particle({ delay, id }: { delay: number; id: number }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setActive(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const colors = ["#ffb700", "#00d4ff", "#d946ef", "#00ff88", "#ff6b6b", "#ffffff"];
  const color = colors[id % colors.length];
  const left = `${5 + (id * 17) % 90}%`;
  const size = 4 + (id % 5);

  return (
    <div
      style={{
        position: "absolute",
        left,
        top: active ? `${100 + ((id * 31) % 20)}%` : `${-5 - (id % 20)}%`,
        width: size,
        height: size,
        borderRadius: size > 7 ? "50%" : 2,
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        transition: active ? `top ${1.5 + (id % 3) * 0.5}s ease-in ${delay}ms, opacity 0.5s ease ${delay + 1200}ms` : "none",
        opacity: active ? 0 : 1,
        pointerEvents: "none",
      }}
    />
  );
}

function RoundSummaryRow({
  roundNum,
  stars,
  target,
}: {
  roundNum: number;
  stars: number;
  target: number;
}) {
  const round = ROUNDS[roundNum - 1];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 14px",
        borderRadius: 8,
        background: `${round.accentColor}0d`,
        border: `1px solid ${round.accentColor}25`,
      }}
    >
      <span style={{ fontSize: 16 }}>{round.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: round.accentColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {round.name} — {round.subtitle}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
          Target: {target}u
          {round.radiationZones.length > 0 && ` · ${round.radiationZones.length} rad zones`}
        </div>
      </div>
      <div style={{ fontSize: 20 }}>
        {stars > 0 ? "⭐".repeat(stars) : <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>}
      </div>
    </div>
  );
}

export default function VictoryScreen({
  starsEarned,
  cumulativeMinerals,
  inventory,
  battery,
  onRestart,
}: VictoryScreenProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);

  const totalStars = starsEarned.reduce((a, b) => a + b, 0);
  const maxStars = MAX_ROUNDS * 3;
  const ratio = totalStars / maxStars;
  const rating =
    ratio >= 0.9 ? "Elite Commander" :
    ratio >= 0.75 ? "Expert Pilot" :
    ratio >= 0.55 ? "Field Operative" :
    ratio >= 0.3 ? "Rookie Recruit" : "Cadet";

  const ratingColor =
    ratio >= 0.9 ? "#ffb700" :
    ratio >= 0.75 ? "#d946ef" :
    ratio >= 0.55 ? "#00d4ff" :
    ratio >= 0.3 ? "#00ff88" : "var(--text-muted)";


  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(16px)",
        transition: "opacity 0.4s ease",
        opacity: show ? 1 : 0,
        overflow: "hidden",
      }}
    >
      {/* Confetti particles */}
      {Array.from({ length: 40 }, (_, i) => (
        <Particle key={i} id={i} delay={i * 60} />
      ))}

      {/* Main card */}
      <div
        style={{
          width: 480,
          maxWidth: "92vw",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 20,
          background: "rgba(10, 14, 22, 0.98)",
          border: "1px solid rgba(255,183,0,0.4)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.9), 0 0 60px rgba(255,183,0,0.15)",
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: show ? "scale(1)" : "scale(0.7)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Hero section */}
        <div
          style={{
            padding: "28px 28px 20px",
            textAlign: "center",
            background: "linear-gradient(180deg, rgba(255,183,0,0.08) 0%, transparent 100%)",
            borderBottom: "1px solid rgba(255,183,0,0.15)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 6, lineHeight: 1 }}>🏆</div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              background: "linear-gradient(135deg, #ffb700, #ff6b6b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.02em",
            }}
          >
            Mission Complete!
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            All {MAX_ROUNDS} sectors surveyed and conquered
          </div>

          {/* Total stars */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
            }}
          >
            <div style={{ fontSize: 32 }}>
              {totalStars > 0 ? `⭐ ×${totalStars}` : "—"}
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 4,
              fontFamily: "var(--font-code)",
            }}
          >
            {totalStars}/{maxStars} Stars
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              padding: "4px 14px",
              borderRadius: 20,
              background: `${ratingColor}18`,
              border: `1px solid ${ratingColor}40`,
              fontSize: 12,
              fontWeight: 700,
              color: ratingColor,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            🎖 {rating}
          </div>
        </div>

        {/* Round recap */}
        <div style={{ padding: "16px 22px" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            Mission Summary
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ROUNDS.map((round, i) => (
              <RoundSummaryRow
                key={round.id}
                roundNum={i + 1}
                stars={starsEarned[i] ?? 0}
                target={round.mineralTarget}
              />
            ))}
          </div>
        </div>

        {/* Final stats */}
        <div style={{ padding: "0 22px" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            Final Haul
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--space-border)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>⛏ Total Minerals</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#00ff88", fontFamily: "var(--font-code)" }}>
                {cumulativeMinerals}u
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>⚡ Battery Left</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: "var(--font-code)",
                  color: battery > 40 ? "var(--glow-green)" : battery > 20 ? "var(--glow-amber)" : "var(--glow-red)",
                }}
              >
                {battery}%
              </span>
            </div>
            {/* Mineral breakdown */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 5,
                marginTop: 4,
              }}
            >
              {(["lithium", "xenocryst", "titanium", "hematite"] as const)
                .filter((t) => inventory[t] > 0)
                .map((type) => {
                  const meta = MINERAL_METAS[type];
                  return (
                    <div
                      key={type}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "4px 8px",
                        borderRadius: 5,
                        background: meta.bgRgba,
                        border: `1px solid ${meta.borderRgba}`,
                      }}
                    >
                      <span style={{ fontSize: 11, color: meta.color }}>
                        {meta.icon} {meta.shortName}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "var(--font-code)",
                          color: meta.color,
                        }}
                      >
                        {inventory[type]}u
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "16px 22px 24px" }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onRestart}
            style={{
              width: "100%",
              justifyContent: "center",
              fontSize: 14,
              padding: "10px",
              letterSpacing: "0.04em",
            }}
          >
            🚀 Play Again — New Mission
          </button>
          <div style={{ textAlign: "center", fontSize: 10, color: "var(--text-muted)", marginTop: 8 }}>
            Can you beat your score? Aim for {maxStars} stars!
          </div>
        </div>
      </div>
    </div>
  );
}
