"use client";

import SkillTree from "@/components/skills/SkillTree";
import type { SkillId } from "@/components/skills/skillsConfig";

interface ToolbarProps {
  isPlaying: boolean;
  isFinished: boolean;
  hasActions: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onReturnToBase: () => void;
  onTour: () => void;
  language: string;
  onLanguageChange?: (lang: string) => void;
  totalActions: number;
  actionIndex: number;
  unlockedSkills: SkillId[];
  skillMinerals: Partial<Record<SkillId, number>>;
  roundName: string;
  roundIcon: string;
  accentColor: string;
  objective: number;
  minerals: number;
  battery: number;
  isCharging: boolean;
  saveStatus: "saved" | "saving";
}

const SPEED_STEPS = [
  { label: "0.5×", value: 800 },
  { label: "1×",   value: 400 },
  { label: "2×",   value: 200 },
  { label: "4×",   value: 100 },
];

export default function Toolbar({
  isPlaying,
  isFinished,
  hasActions,
  speed,
  onSpeedChange,
  onPlay,
  onPause,
  onReset,
  onReturnToBase,
  onTour,
  language,
  onLanguageChange,
  totalActions,
  actionIndex,
  unlockedSkills,
  skillMinerals,
  roundName,
  roundIcon,
  accentColor,
  objective,
  minerals,
  battery,
  isCharging,
  saveStatus,
}: ToolbarProps) {
  const actionsCompleted = Math.max(0, actionIndex + 1);
  const objectivePercent = Math.min(100, Math.round((minerals / objective) * 100));
  const batteryColor = battery < 25 ? "var(--glow-red)" : battery < 60 ? "var(--glow-amber)" : "var(--glow-green)";

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        minHeight: 58,
        borderBottom: "1px solid var(--space-border)",
        background: "var(--space-mid)",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "linear-gradient(135deg, var(--mars-orange), var(--rust))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            boxShadow: "0 2px 10px rgba(232,99,26,0.4)",
          }}
        >
          🚀
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
            Mars Rover
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
            Mission Control
          </div>
        </div>
      </div>

      <div style={{ width: 1, background: "var(--space-border)", alignSelf: "stretch", margin: "12px 0" }} />

      <div title={roundName} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 130 }}>
        <span style={{ fontSize: 18 }}>{roundIcon}</span>
        <div>
          <div style={{ color: accentColor, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{roundName}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 10 }}>Round objective</div>
        </div>
      </div>
      <div style={{ width: 1, background: "var(--space-border)", alignSelf: "stretch", margin: "12px 0" }} />
      <div title={`${minerals} / ${objective} mineral units`} style={{ width: 180, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--font-code)" }}>
          <span style={{ color: "var(--text-muted)", textTransform: "uppercase" }}>Mission quota</span>
          <span style={{ color: minerals >= objective ? "var(--glow-green)" : accentColor }}>{minerals >= objective ? "✓ SECURED" : `${minerals}/${objective}u`}</span>
        </div>
        <div style={{ height: 7, borderRadius: 4, background: "var(--space-border)", overflow: "hidden" }}>
          <div style={{ width: `${objectivePercent}%`, height: "100%", background: minerals >= objective ? "var(--glow-green)" : accentColor, transition: "width .3s ease" }} />
        </div>
      </div>
      <div title={isCharging ? "Charging at station" : "Battery reserve"} style={{ width: 150, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--font-code)", color: batteryColor }}>
          <span>{isCharging ? "⚡ CHARGING" : "⚡ POWER"}</span><span>{battery}%</span>
        </div>
        <div style={{ height: 7, borderRadius: 4, background: "var(--space-border)", overflow: "hidden" }}>
          <div style={{ width: `${battery}%`, height: "100%", background: batteryColor, transition: "width .3s ease" }} />
        </div>
      </div>

      {/* Playback controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          type="button"
          id="btn-play-pause"
          className="btn btn--ghost btn--icon"
          onClick={isPlaying ? onPause : onPlay}
          disabled={!hasActions || (isFinished && !isPlaying)}
          title={isPlaying ? "Pause" : "Play"}
          style={{ fontSize: 16, padding: "4px 8px" }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          onClick={onReturnToBase}
          title="Return to landing pad (preserves mission progress)"
          style={{ fontSize: 13, padding: "4px 8px" }}
        >
          🏠
        </button>
        <button
          type="button"
          id="btn-reset"
          className="btn btn--ghost btn--icon"
          onClick={onReset}
          disabled={!hasActions}
          title="Reset"
          style={{ fontSize: 14, padding: "4px 8px" }}
        >
          ⏹
        </button>
      </div>

      {/* Speed selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "3px",
          borderRadius: "var(--radius-md)",
          background: "var(--space-surface)",
          border: "1px solid var(--space-border)",
        }}
      >
        {SPEED_STEPS.map((s) => (
          <button
            type="button"
            key={s.value}
            id={`btn-speed-${s.label.replace("×", "x")}`}
            onClick={() => onSpeedChange(s.value)}
            style={{
              padding: "2px 8px",
              borderRadius: 5,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              fontWeight: 600,
              background: speed === s.value ? "var(--space-border-glow)" : "transparent",
              color: speed === s.value ? "var(--glow-cyan)" : "var(--text-muted)",
              transition: "all 0.15s",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {hasActions && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 200 }}>
          <div
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: "var(--space-border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: totalActions > 0 ? `${(actionsCompleted / totalActions) * 100}%` : "0%",
                background: isFinished ? "var(--glow-green)" : "var(--glow-cyan)",
                borderRadius: 2,
                transition: "width 0.3s ease",
                boxShadow: `0 0 6px ${isFinished ? "var(--glow-green)" : "var(--glow-cyan)"}80`,
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-code)", whiteSpace: "nowrap" }}>
            {actionsCompleted}/{totalActions}
          </span>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Skill tree */}
      <SkillTree
        unlockedIds={unlockedSkills}
        skillMinerals={skillMinerals}
        language={language}
      />

      <button type="button" className="btn btn--ghost" onClick={onTour} title="Open Mission Tour">🧭 Tour</button>
      <span className="badge badge--green" title="Mission save status">{saveStatus === "saving" ? "⏳ Saving" : "☁ Saved"}</span>

      {/* Language selector */}
      <select
        value={language}
        onChange={(e) => onLanguageChange?.(e.target.value)}
        aria-label="Language"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--glow-cyan)",
          fontFamily: "var(--font-ui)",
          background: "rgba(0,212,255,0.08)",
          border: "1px solid rgba(0,212,255,0.2)",
          borderRadius: "var(--radius-md)",
          outline: "none",
          cursor: "pointer",
          padding: "5px 8px",
        }}
      >
        <option value="python" style={{ background: "#111827" }}>Python</option>
        <option value="java" style={{ background: "#111827" }}>Java</option>
        <option value="cpp" style={{ background: "#111827" }}>C++</option>
      </select>
    </header>
  );
}
