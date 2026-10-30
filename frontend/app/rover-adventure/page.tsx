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
import BuildPanel from "@/components/buildings/BuildPanel";
import {
  BUILDINGS,
  BUILDINGS_UNLOCK_ROUND,
  BuildingType,
  canAfford,
} from "@/components/buildings/buildingsConfig";
import {
  GRID_SIZE,
  MAP_MASK,
  START_CELL,
} from "@/components/Canvas/mapConfig";
import { getDepositKey } from "@/components/Canvas/minerals";
import { useSkillTree } from "@/components/skills/useSkillTree";
import { SKILL_MAP, type SkillId } from "@/components/skills/skillsConfig";
import SkillUnlockModal from "@/components/skills/SkillUnlockModal";
import type { LessonLanguage } from "@/components/skills/skillLessons";
import { useAuth } from "@/components/AuthContext";
import {
  getMarsAdventureSave,
  saveMarsAdventure,
  type MarsAdventureSave,
} from "@/lib/api";

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
        background: "#000000",
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
  const { token } = useAuth();
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(DEFAULT_CODES["python"]);
  const [saveReady, setSaveReady] = useState(!token);

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_CODES[lang]);
  }, []);
  const [isRunning, setIsRunning] = useState(false);
  const [actions, setActions] = useState<RoverAction[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const {
    unlocked: unlockedSkills,
    minerals: skillMinerals,
    unlockFromCode,
    addMinerals,
  } = useSkillTree();
  const [skillUnlock, setSkillUnlock] = useState<SkillId[] | null>(null);

  // Layout states
  const [activeTab, setActiveTab] = useState<"code" | "console">("code");

  // Building / placement states
  const [placingBuilding, setPlacingBuilding] = useState<BuildingType | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  // ── Round Manager ────────────────────────────────────────────────────────
  const {
    state: roundState,
    currentRoundConfig,
    getDepositsForRound,
    handleRoundFinished,
    advanceRound,
    dismissModal,
    resetAll,
    addBuilding,
    syncInventory,
    hydrate: hydrateRounds,
  } = useRoundManager();

  // Compute per-round deposits for the animation hook
  const currentRoundDeposits = getDepositsForRound(roundState.currentRound);

  const chargingUnlocked = roundState.currentRound >= BUILDINGS_UNLOCK_ROUND;
  const chargingStations = roundState.buildings
    .filter((b) => b.type === "charging_station")
    .map((b) => ({ col: b.col, row: b.row }));

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
    spendInventory,
    hydrate: hydrateRover,
  } = useRoverAnimation(
    actions,
    currentRoundConfig.radiationZones,
    roundState.persistentBattery,
    roundState.persistentInventory,
    currentRoundDeposits,
    chargingStations,
    chargingUnlocked
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSaveReady(false);
    });
    getMarsAdventureSave(token)
      .then((saved) => {
        if (cancelled) return;
        const gameState = saved.game_state;
        hydrateRounds({
          currentRound: gameState.currentRound,
          starsEarned: gameState.starsEarned,
          cumulativeMinerals: gameState.cumulativeMinerals,
          persistentBattery: gameState.persistentBattery,
          persistentInventory: saved.resources,
          buildings: gameState.buildings,
        });
        hydrateRover({
          ...saved.last_location,
          battery: gameState.persistentBattery ?? 100,
          inventory: saved.resources,
        });
        setCode(saved.last_code);
        setSaveReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const isMissingSave =
          error &&
          typeof error === "object" &&
          "status" in error &&
          typeof error.status === "number" &&
          error.status === 404;
        if (!isMissingSave) {
          console.error("Could not load Mars Adventure progress.", error);
          return;
        }
        // A missing save is a new game. Enable autosave so the default state
        // is inserted into marsAdvData without blocking the game behind a popup.
        setSaveReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token, hydrateRounds, hydrateRover]);

  useEffect(() => {
    if (!token || !saveReady) return;
    const timer = window.setTimeout(() => {
      const save: MarsAdventureSave = {
        resources: roverState.inventory,
        last_location: {
          col: roverState.col,
          row: roverState.row,
          facing: roverState.facing,
        },
        last_code: code,
        game_state: {
          currentRound: roundState.currentRound,
          starsEarned: roundState.starsEarned,
          cumulativeMinerals: roundState.cumulativeMinerals,
          persistentBattery: roverState.battery,
          buildings: roundState.buildings,
        },
      };
      saveMarsAdventure(token, save).catch((error: unknown) => {
        console.error("Could not save Mars Adventure progress.", error);
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [
    token,
    saveReady,
    code,
    roverState.col,
    roverState.row,
    roverState.facing,
    roverState.battery,
    roverState.inventory,
    roundState.currentRound,
    roundState.starsEarned,
    roundState.cumulativeMinerals,
    roundState.buildings,
  ]);

  // ── Round completion detection ────────────────────────────────────────────
  // Fire once when animation finishes and we haven't already reported this run
  const finishedReportedRef = useRef(false);

  useEffect(() => {
    if (isFinished && !finishedReportedRef.current && actions.length > 0) {
      finishedReportedRef.current = true;
      addMinerals(roverState.minerals);
      handleRoundFinished(
        roverState.minerals,
        roverState.battery,
        roverState.inventory
      );
    }
  }, [isFinished, actions.length, roverState.minerals, roverState.battery, roverState.inventory, handleRoundFinished, addMinerals]);

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
    setPlacingBuilding(null);
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
      } else {
        const newSkills = unlockFromCode(code);
        if (newSkills.length > 0) {
          setSkillUnlock(newSkills);
          newSkills.forEach((id) =>
            appendLog({
              type: "system",
              message: `🧠 Skill unlocked: ${SKILL_MAP[id].name}`,
            })
          );
        }
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
      appendLog({
        type: "error",
        message: `Connection error: ${message} (API: ${API_URL})`,
      });
      setActiveTab("console");
    } finally {
      setIsRunning(false);
    }
  }, [code, language, isRunning, reset, appendLog, play, unlockFromCode]);

  // ── Log new actions as they play ──────────────────────────────────────────
  useEffect(() => {
    if (!currentAction) return;
    let msg = actionToMessage(currentAction);
    if (currentAction.action === "DRILL" && roverState.lastDrillResult) {
      msg = roverState.lastDrillResult.message;
    } else if (currentAction.action === "CHARGE" && roverState.lastChargeResult) {
      msg = roverState.lastChargeResult.message;
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
  }, [currentAction, appendLog, roverState.lastDrillResult, roverState.lastChargeResult, roverState.deposits, roverState.col, roverState.row]);

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
    setPlacingBuilding(null);
    setBuildError(null);
    finishedReportedRef.current = false;
    if (roundState.currentRound + 1 === BUILDINGS_UNLOCK_ROUND) {
      appendLog({
        type: "system",
        message:
          "🏗 New building unlocked: Charging Station. Open Build to place one on the map.",
      });
    }
  }, [advanceRound, reset, appendLog, roundState.currentRound]);

  // ── Handle full restart ───────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    resetAll();
    setActions([]);
    setLogs([]);
    reset();
    setPlacingBuilding(null);
    setBuildError(null);
    finishedReportedRef.current = false;
  }, [resetAll, reset]);

  // ── Building placement ────────────────────────────────────────────────────
  const handleStartPlacement = useCallback(
    (type: BuildingType) => {
      if (!chargingUnlocked) return;
      setBuildError(null);
      setPlacingBuilding(type);
    },
    [chargingUnlocked]
  );

  const handleCancelPlacement = useCallback(() => {
    setPlacingBuilding(null);
    setBuildError(null);
  }, []);

  useEffect(() => {
    if (!placingBuilding) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancelPlacement();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [placingBuilding, handleCancelPlacement]);

  const handlePlaceBuilding = useCallback(
    (col: number, row: number) => {
      if (!placingBuilding || !chargingUnlocked) return;
      const def = BUILDINGS[placingBuilding];

      if (
        col < 0 ||
        col >= GRID_SIZE ||
        row < 0 ||
        row >= GRID_SIZE ||
        MAP_MASK[row][col] === 0
      ) {
        setBuildError("Choose a walkable terrain tile.");
        return;
      }
      if (col === START_CELL.col && row === START_CELL.row) {
        setBuildError("The landing pad is reserved.");
        return;
      }
      if (col === roverState.col && row === roverState.row) {
        setBuildError("Move the rover off this tile first.");
        return;
      }
      if (roundState.buildings.some((b) => b.col === col && b.row === row)) {
        setBuildError("A building already occupies this tile.");
        return;
      }
      const deposit = roverState.deposits[getDepositKey(col, row)];
      if (deposit && !deposit.depleted) {
        setBuildError("Can't build on an active mineral deposit.");
        return;
      }
      if (!canAfford(roverState.inventory, def.cost)) {
        setBuildError("Not enough minerals to build a Charging Station.");
        return;
      }

      const nextInventory = spendInventory(def.cost);
      if (!nextInventory) {
        setBuildError("Not enough minerals to build a Charging Station.");
        return;
      }

      addBuilding({
        id: `${placingBuilding}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: placingBuilding,
        col,
        row,
      });
      syncInventory(nextInventory);
      appendLog({
        type: "system",
        message: `🏗 Charging Station deployed at (${col}, ${row}).`,
      });
      setPlacingBuilding(null);
      setBuildError(null);
    },
    [
      placingBuilding,
      chargingUnlocked,
      roverState,
      roundState.buildings,
      spendInventory,
      addBuilding,
      syncInventory,
      appendLog,
    ]
  );

  const lessonLanguage: LessonLanguage =
    language === "java" || language === "cpp" ? language : "python";

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
        hasActions={actions.length > 0}
        speed={speed}
        onSpeedChange={setSpeed}
        onPlay={play}
        onPause={pause}
        onReset={reset}
        language={language}
        onLanguageChange={handleLanguageChange}
        totalActions={totalActions}
        actionIndex={roverState.actionIndex}
        unlockedSkills={unlockedSkills}
        skillMinerals={skillMinerals}
      />

      {/* Skill unlock lesson */}
      {skillUnlock && (
        <SkillUnlockModal
          skills={skillUnlock}
          unlockedIds={unlockedSkills}
          language={lessonLanguage}
          onClose={() => setSkillUnlock(null)}
        />
      )}

      {/* Round objective banner */}
      <RoundBanner
        roundConfig={currentRoundConfig}
        cumulativeMinerals={roundState.cumulativeMinerals + roverState.minerals}
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
            width: "clamp(360px, 38vw, 620px)",
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
                  background: "#000000",
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
                    background: "#050505",
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

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleRun}
                      disabled={isRunning}
                      title="Run code (Ctrl+Enter)"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        background: "rgba(0,212,255,0.1)",
                        border: "1px solid rgba(0,212,255,0.3)",
                        color: isRunning ? "var(--text-muted)" : "var(--glow-cyan)",
                        fontFamily: "var(--font-code)",
                        fontSize: 10.5,
                        fontWeight: 600,
                        cursor: isRunning ? "default" : "pointer",
                        padding: "3px 10px",
                        borderRadius: "var(--radius-sm)",
                        transition: "background 0.15s, border-color 0.15s",
                        opacity: isRunning ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (isRunning) return;
                        (e.currentTarget as HTMLElement).style.background = "rgba(0,212,255,0.18)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,212,255,0.5)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(0,212,255,0.1)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,212,255,0.3)";
                      }}
                    >
                      {isRunning ? (
                        <>
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              border: "1.5px solid rgba(0,212,255,0.3)",
                              borderTopColor: "var(--glow-cyan)",
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
                </div>

                {/* Window Content */}
                <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language={language}
                    readOnly={isRunning}
                    chargingUnlocked={chargingUnlocked}
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
                chargingUnlocked={chargingUnlocked}
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
            buildings={roundState.buildings}
            placingBuilding={placingBuilding !== null}
            onPlaceBuilding={handlePlaceBuilding}
          />

          {chargingUnlocked && (
            <div style={{ position: "absolute", right: 12, bottom: 46, zIndex: 20 }}>
              <BuildPanel
                round={roundState.currentRound}
                inventory={roverState.inventory}
                buildings={roundState.buildings}
                placing={placingBuilding}
                error={buildError}
                busy={isPlaying || isRunning}
                onStartPlacement={handleStartPlacement}
                onCancelPlacement={handleCancelPlacement}
              />
            </div>
          )}
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
