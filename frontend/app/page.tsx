"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

import Toolbar from "@/components/UI/Toolbar";
import HUD from "@/components/UI/HUD";
import ConsoleOutput, { LogEntry } from "@/components/IDE/ConsoleOutput";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  const [leftWidth, setLeftWidth] = useState(42); // percentage

  // Resize state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(42);

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

  // Log new actions as they play
  useEffect(() => {
    if (!currentAction) return;
    appendLog({
      type: "action",
      action: currentAction.action,
      message: actionToMessage(currentAction),
      raw: currentAction,
    });
  }, [currentAction, appendLog]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isRunning]);

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
    } finally {
      setIsRunning(false);
    }
  }, [code, language, isRunning, reset, appendLog, play]);

  // Resize drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = leftWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [leftWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const totalW = window.innerWidth;
      const delta = e.clientX - dragStartX.current;
      const newPct = Math.min(65, Math.max(25, dragStartW.current + (delta / totalW) * 100));
      setLeftWidth(newPct);
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const rightWidth = 100 - leftWidth;

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

      {/* Main split pane */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT — IDE Panel */}
        <div
          style={{
            width: `${leftWidth}%`,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--space-border)",
            overflow: "hidden",
          }}
        >
          {/* IDE header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 14px",
              background: "var(--space-mid)",
              borderBottom: "1px solid var(--space-border)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Tab-style file label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                  background: "#0d1117",
                  border: "1px solid var(--space-border)",
                  borderBottom: "1px solid #0d1117",
                  marginBottom: -9,
                }}
              >
                <span style={{ fontSize: 12 }}>🐍</span>
                <span style={{ fontFamily: "var(--font-code)", fontSize: 12, color: "var(--text-primary)" }}>
                  mission.py
                </span>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mars-orange)" }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
                Ctrl+Enter to run
              </span>
            </div>
          </div>

          {/* Monaco Editor */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              readOnly={isRunning}
            />
          </div>
        </div>

        {/* Resize handle */}
        <div
          className={`resize-handle ${isDragging.current ? "dragging" : ""}`}
          onMouseDown={onMouseDown}
          title="Drag to resize"
        />

        {/* RIGHT — Canvas + HUD + Console */}
        <div
          style={{
            width: `${rightWidth}%`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Upper right: Canvas + HUD sidebar */}
          <div style={{ flex: "0 0 60%", display: "flex", overflow: "hidden" }}>

            {/* Isometric canvas */}
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              <IsometricGrid
                roverState={roverState}
                isPlaying={isPlaying}
                progress={progress}
              />
            </div>

            {/* HUD sidebar */}
            <div
              style={{
                width: 160,
                borderLeft: "1px solid var(--space-border)",
                background: "var(--space-mid)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid var(--space-border)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                ◈ Systems
              </div>
              <HUD
                roverState={roverState}
                totalActions={totalActions}
                isFinished={isFinished}
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--space-border)", flexShrink: 0 }} />

          {/* Lower right: Console */}
          <div style={{ flex: "0 0 40%", overflow: "hidden" }}>
            <ConsoleOutput
              logs={logs}
              onClear={() => setLogs([])}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
