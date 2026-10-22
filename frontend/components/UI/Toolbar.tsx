"use client";

interface ToolbarProps {
  isPlaying: boolean;
  isFinished: boolean;
  hasActions: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  language: string;
  onLanguageChange?: (lang: string) => void;
  totalActions: number;
  actionIndex: number;
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
  language,
  onLanguageChange,
  totalActions,
  actionIndex,
}: ToolbarProps) {
  const actionsCompleted = Math.max(0, actionIndex + 1);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        height: 52,
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
