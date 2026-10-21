"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

import Toolbar from "@/components/UI/Toolbar";
import Terminal, { LogEntry } from "@/components/IDE/Terminal";
import IsometricGrid from "@/components/Canvas/IsometricGrid";
import { useRoverAnimation, RoverAction } from "@/components/Canvas/useRoverAnimation";
import { DEFAULT_CODES } from "@/components/IDE/CodeEditor";
import RoundBanner from "@/components/rounds/RoundBanner";
import RoundCompleteModal from "@/components/rounds/RoundCompleteModal";
import VictoryScreen from "@/components/rounds/VictoryScreen";
import { useRoundManager } from "@/components/rounds/useRoundManager";
import { MAX_ROUNDS, ROUNDS } from "@/components/rounds/roundsConfig";

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

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : process.env.BACKEND_RENDER_URL ?? "http://localhost:8000";


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
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(DEFAULT_CODES["python"]);

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_CODES[lang]);
  }, []);
  const [isRunning, setIsRunning] = useState(false);
  const [actions, setActions] = useState<RoverAction[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Layout states
  const [activeTab, setActiveTab] = useState<"code" | "console">("code");

  // ── Round Manager ────────────────────────────────────────────────────────
  const {
    state: roundState,
    currentRoundConfig,
    getDepositsForRound,
    handleRoundFinished,
    advanceRound,
    dismissModal,
    resetAll,
  } = useRoundManager();

  // Compute per-round deposits for the animation hook
  const currentRoundDeposits = getDepositsForRound(roundState.currentRound);

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
  } = useRoverAnimation(
    actions,
    currentRoundConfig.radiationZones,
    roundState.persistentBattery,
    roundState.persistentInventory,
    currentRoundDeposits
  );

  // ── Round completion detection ────────────────────────────────────────────
  // Fire once when animation finishes and we haven't already reported this run
  const finishedReportedRef = useRef(false);

  useEffect(() => {
    if (isFinished && !finishedReportedRef.current && actions.length > 0) {
      finishedReportedRef.current = true;
      handleRoundFinished(
        roverState.minerals,
        roverState.battery,
        roverState.inventory
      );
    }
  }, [isFinished, actions.length, roverState.minerals, roverState.battery, roverState.inventory, handleRoundFinished]);

  // Reset the "finished reported" flag each time a new run starts
  useEffect(() => {
    finishedReportedRef.current = false;
  }, [actions]);

  // ── Append a log entry ────────────────────────────────────────────────────
  const appendLog = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    setLogs((prev) => [
      ...prev,
      { ...entry, id: makeId(), timestamp: Date.now() },
    ]);
  }, []);

  // ── Run the player's code ─────────────────────────────────────────────────
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

  // ── Log new actions as they play ──────────────────────────────────────────
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

  // ── Keyboard shortcut: Ctrl+Enter to run ─────────────────────────────────
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

  // ── Handle advancing to next round ────────────────────────────────────────
  const handleAdvanceRound = useCallback(() => {
    advanceRound();
    setActions([]);
    setLogs([]);
    reset();
    finishedReportedRef.current = false;
  }, [advanceRound, reset]);

  // ── Handle full restart ───────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    resetAll();
    setActions([]);
    setLogs([]);
    reset();
    finishedReportedRef.current = false;
  }, [resetAll, reset]);

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
        onLanguageChange={handleLanguageChange}
        totalActions={totalActions}
        actionIndex={roverState.actionIndex}
      />

      {/* Round objective banner */}
      <RoundBanner
        roundConfig={currentRoundConfig}
        cumulativeMinerals={roundState.cumulativeMinerals + roverState.minerals}
        currentRoundMinerals={roverState.minerals}
        starsEarned={roundState.starsEarned}
        battery={roverState.battery}
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
                <span>{language === "python" ? "🐍" : language === "cpp" ? "⚙️" : "☕"}</span>
                <span>{language === "python" ? "mission.py" : language === "cpp" ? "main.cpp" : "Main.java"}</span>
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

        {/* FULLSCREEN BACKGROUND 9X9 CANVAS */}
        <div style={{ flex: 1, width: "100%", height: "100%", position: "relative" }}>
          <IsometricGrid
            roverState={roverState}
            isPlaying={isPlaying}
            progress={progress}
            currentAction={currentAction}
            radiationZones={currentRoundConfig.radiationZones}
          />
        </div>
      </div>

      {/* Round Complete Modal */}
      {roundState.showCompleteModal && roundState.currentRound < MAX_ROUNDS && (
        <RoundCompleteModal
          roundConfig={currentRoundConfig}
          nextRoundConfig={ROUNDS[roundState.currentRound]} // currentRound is already advanced in state? No — advance happens on button click
          stars={roundState.starsEarned[roundState.currentRound - 1]}
          cumulativeMinerals={roundState.cumulativeMinerals}
          battery={roundState.persistentBattery}
          inventory={roundState.persistentInventory}
          mineralTarget={currentRoundConfig.mineralTarget}
          onAdvance={handleAdvanceRound}
          onDismiss={dismissModal}
        />
      )}

      {/* Victory Screen */}
      {roundState.showVictoryScreen && (
        <VictoryScreen
          starsEarned={roundState.starsEarned}
          cumulativeMinerals={roundState.cumulativeMinerals}
          inventory={roundState.persistentInventory}
          battery={roundState.persistentBattery}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
