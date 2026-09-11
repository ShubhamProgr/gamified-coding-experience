"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

import Toolbar from "@/components/UI/Toolbar";

import Terminal, { LogEntry } from "@/components/IDE/Terminal";
import IsometricGrid from "@/components/Canvas/IsometricGrid";
import { useRoverAnimation, RoverAction } from "@/components/Canvas/useRoverAnimation";
import { DEFAULT_CODE } from "@/components/IDE/CodeEditor";

// Monaco must be loaded client-side only (no SSR)
const CodeEditor = dynamic(() => import("@/components/IDE/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "var(--text-muted)",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        gap: 10,
        background: "#0d1117",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          border: "2px solid var(--space-border-glow)",
          borderTopColor: "var(--glow-cyan)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      Loading editor…
    </div>
  ),
});

const API_URL = process.env.BACKEND_RENDER_URL ?? "http://localhost:8000";

function makeId() {
  return Math.random().toString(36).slice(2);
}

function actionToMessage(action: RoverAction): string {
  switch (action.action) {
    case "DRIVE":       return `Driving ${action.direction}`;
    case "DRILL":       return "Drilling for minerals";
    case "SCAN":        return "Scanning tile";
    case "CHARGE":      return `Charging battery +${action.amount ?? 10}%`;
    case "TURN":        return `Turning ${action.turn ?? "LEFT"}`;
    case "GET_POSITION": return "Querying position";
    case "LOG":         return action.message ?? "";
    default:            return action.action;
  }
}

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language] = useState("python");
  const [isRunning, setIsRunning] = useState(false);
  const [actions, setActions] = useState<RoverAction[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Layout states
  const [activeTab, setActiveTab] = useState<"code" | "console">("code");

  const {
    roverState,
    isPlaying,
    isFinished,
    speed,
    setSpeed,
    progress,
    currentAction,
    play,
    pause,
    reset,
    totalActions,
  } = useRoverAnimation(actions);

  // Append a log entry
  const appendLog = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    setLogs((prev) => [
      ...prev,
      { ...entry, id: makeId(), timestamp: Date.now() },
    ]);
  }, []);

  // Run the player's code
  const handleRun = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    reset();
    setLogs([]);

    appendLog({ type: "system", message: "Sending code to Mission Control…" });

    try {
      const res = await fetch(`${API_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error ${res.status}: ${text}`);
      }

      const data: { actions: RoverAction[]; error: string | null } = await res.json();

      if (data.error) {
        appendLog({ type: "error", message: data.error });
        setActiveTab("console");
      }

      if (data.actions.length > 0) {
        appendLog({
          type: "system",
          message: `Received ${data.actions.length} action${data.actions.length !== 1 ? "s" : ""}. Starting playback…`,
        });
        setActions(data.actions);
        // Auto-play after short delay
        setTimeout(() => play(), 200);
      } else if (!data.error) {
        appendLog({ type: "info", message: "No actions generated. Add rover commands to your script." });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      appendLog({ type: "error", message: `Connection error: ${message}` });
      setActiveTab("console");
    } finally {
      setIsRunning(false);
    }
  }, [code, language, isRunning, reset, appendLog, play]);

  // Log new actions as they play
  useEffect(() => {
    if (!currentAction) return;
    let msg = actionToMessage(currentAction);
    if (currentAction.action === "DRILL" && roverState.lastDrillResult) {
      msg = roverState.lastDrillResult.message;
    } else if (currentAction.action === "SCAN") {
      const depKey = `${roverState.col},${roverState.row}`;
      const dep = roverState.deposits[depKey];
      if (dep && !dep.depleted) {
        msg = `🔬 Scan: Rich ${dep.type.toUpperCase()} deposit detected (${dep.remainingAmount}u reserves)`;
      } else {
        msg = `🔬 Scan: Barren basaltic regolith. No rich mineral vein detected.`;
      }
    }
    queueMicrotask(() => {
      appendLog({
        type: "action",
        action: currentAction.action,
        message: msg,
        raw: currentAction,
      });
    });
  }, [currentAction, appendLog, roverState.lastDrillResult, roverState.deposits, roverState.col, roverState.row]);

  // Keyboard shortcut: Ctrl+Enter to run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleRun]);


  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--space-bg)",
      }}
    >
      {/* Top toolbar */}
      <Toolbar
        isPlaying={isPlaying}
        isFinished={isFinished}
        isRunning={isRunning}
        hasActions={actions.length > 0}
        speed={speed}
        onSpeedChange={setSpeed}
        onPlay={play}
        onPause={pause}
        onReset={reset}
        onRun={handleRun}
        language={language}
        totalActions={totalActions}
        actionIndex={roverState.actionIndex}
      />

      {/* Main visual workspace */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>

        {/* LEFT HAND — CODE EDITOR & CONSOLE */}
        <div
          style={{
            aspectRatio: "9 / 16",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--space-border)",
            background: "rgba(13, 17, 23, 1)",
          }}
        >
          {/* Window Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "rgba(17, 24, 39, 0.95)",
              borderBottom: "1px solid var(--space-border)",
              flexShrink: 0,
            }}
          >
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(0,0,0,0.35)",
                padding: "2px 4px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("code")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: activeTab === "code" ? "var(--space-card)" : "transparent",
                  color: activeTab === "code" ? "var(--text-primary)" : "var(--text-muted)",
                  fontFamily: "var(--font-code)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span>🐍</span>
                <span>mission.py</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("console")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: activeTab === "console" ? "var(--space-card)" : "transparent",
                  color: activeTab === "console" ? "var(--glow-cyan)" : "var(--text-muted)",
                  fontFamily: "var(--font-code)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span>&gt;_</span>
                <span>Terminal</span>
                {logs.length > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 5px",
                      borderRadius: 8,
                      background: "rgba(0,212,255,0.2)",
                      color: "var(--glow-cyan)",
                    }}
                  >
                    {logs.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Window Content */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {activeTab === "code" ? (
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                readOnly={isRunning}
              />
            ) : (
              <Terminal
                logs={logs}
                onClear={() => setLogs([])}
                onRunScript={handleRun}
                roverState={roverState}
              />
            )}
          </div>

          {/* Window Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "rgba(13, 17, 23, 0.95)",
              borderTop: "1px solid var(--space-border)",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
              💡 Type <b style={{ color: "var(--glow-cyan)" }}>/help</b> in Terminal
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={reset}
                disabled={!actions.length}
                style={{ padding: "3px 8px", fontSize: 11 }}
              >
                ↺ Reset
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleRun}
                disabled={isRunning}
                style={{ padding: "4px 12px", fontSize: 11 }}
              >
                {isRunning ? "Running…" : "▶ Run Script"}
              </button>
            </div>
          </div>
        </div>

        {/* FULLSCREEN BACKGROUND 3X3 CANVAS */}
        <div style={{ flex: 1, width: "100%", height: "100%", position: "relative" }}>
          <IsometricGrid
            roverState={roverState}
            isPlaying={isPlaying}
            progress={progress}
            currentAction={currentAction}
          />
        </div>
      </div>
    </div>
  );
}
