"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

import Toolbar from "@/components/UI/Toolbar";
import Terminal, { LogEntry } from "@/components/IDE/Terminal";
import Storage from "@/components/IDE/Storage";
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
        msg = `🔬 Scan: Barren basaltic terrain. No rich mineral vein detected.`;
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

        {/* MISSION WINDOW — TOP LEFT (OVER MAP) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 10,
            width: "clamp(420px, 44vw, 760px)",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              height: "clamp(320px, 60%, 600px)",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              pointerEvents: "auto",
            }}
          >
            {activeTab === "code" ? (
            <div style={{ flex: 1, display: "flex", padding: 10, minHeight: 0 }}>
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
                    padding: "7px 12px",
                    borderBottom: "1px solid var(--space-border)",
                    background: "#0d121b",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span className="window-btn window-btn--red" style={{ width: 10, height: 10 }} />
                      <span className="window-btn window-btn--yellow" style={{ width: 10, height: 10 }} />
                      <span className="window-btn window-btn--green" style={{ width: 10, height: 10 }} />
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>
                      {language !== "python" && (
                        <span>{language === "cpp" ? "⚙️" : "☕"}</span>
                      )}
                      <span style={{ fontFamily: "var(--font-code)" }}>
                        {language === "python" ? "mission.py" : language === "cpp" ? "main.cpp" : "Main.java"}
                      </span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("console")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-code)",
                      fontSize: 10.5,
                      cursor: "pointer",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-sm)",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-muted)")}
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

                {/* Window Content */}
                <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language={language}
                    readOnly={isRunning}
                  />
                </div>
              </div>
            </div>
            ) : (
              <Terminal
                logs={logs}
                onClear={() => setLogs([])}
                onRunScript={handleRun}
                roverState={roverState}
                onShowCode={() => setActiveTab("code")}
              />
            )}
          </div>

          <Storage roverState={roverState} />
        </div>

        {/* MAP — FULL AREA */}
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
