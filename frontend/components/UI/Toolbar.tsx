"use client";

interface ToolbarProps {
  isPlaying: boolean;
  isFinished: boolean;
  isRunning: boolean;
  hasActions: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onRun: () => void;
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
  isRunning,
  hasActions,
  speed,
  onSpeedChange,
  onPlay,
  onPause,
  onReset,
  onRun,
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

      {/* Run button */}
      <button
        type="button"
        id="btn-run"
        className="btn btn--primary"
        onClick={onRun}
        disabled={isRunning}
        title="Execute code (Ctrl+Enter)"
        style={{ minWidth: 90 }}
      >
        {isRunning ? (
          <>
            <div
              style={{
                width: 12,
                height: 12,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Running
          </>
        ) : (
          <>▶ Run</>
        )}
      </button>

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

      {/* 9x9 Sector indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 8px",
          borderRadius: "var(--radius-sm)",
          background: "rgba(232,99,26,0.12)",
          border: "1px solid rgba(232,99,26,0.3)",
          fontSize: 11,
          color: "var(--mars-orange)",
          fontWeight: 600,
          fontFamily: "var(--font-code)",
        }}
      >
        <span>🗺 9×9 Sector</span>
      </div>


      {/* Language selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: "var(--radius-md)",
          background: "rgba(0,212,255,0.08)",
          border: "1px solid rgba(0,212,255,0.2)",
        }}
      >
        <span style={{ fontSize: 12 }}>
          {language === "python" ? "🐍" : language === "cpp" ? "⚙️" : "☕"}
        </span>
        <select
          value={language}
          onChange={(e) => onLanguageChange?.(e.target.value)}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--glow-cyan)",
            fontFamily: "var(--font-ui)",
            background: "transparent",
            border: "none",
            outline: "none",
            cursor: "pointer",
            paddingRight: 4,
          }}
        >
          <option value="python" style={{ background: "#111827" }}>Python</option>
          <option value="java" style={{ background: "#111827" }}>Java</option>
          <option value="cpp" style={{ background: "#111827" }}>C++</option>
        </select>
      </div>

      {/* Status dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: isRunning ? "var(--glow-amber)" : isFinished ? "var(--glow-green)" : "var(--text-muted)",
            boxShadow: isRunning ? "0 0 8px var(--glow-amber)" : isFinished ? "0 0 8px var(--glow-green)" : "none",
            animation: isRunning ? "pulse-glow 1s ease-in-out infinite" : "none",
          }}
        />
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
          {isRunning ? "Compiling" : isFinished ? "Done" : hasActions ? "Ready" : "Idle"}
        </span>
      </div>
    </header>
  );
}
