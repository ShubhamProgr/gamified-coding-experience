"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import type { RoverState } from "../Canvas/useRoverAnimation";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: "action" | "error" | "info" | "system" | "command" | "output";
  action?: string;
  message: string;
  raw?: object;
}

interface TerminalProps {
  logs: LogEntry[];
  onClear: () => void;
  onRunScript?: () => void;
  roverState?: RoverState;
}

interface CommandOutput {
  id: string;
  type: "command" | "output" | "system";
  text: string;
  timestamp: number;
}

function getActionColor(action?: string): string {
  switch (action) {
    case "DRIVE":       return "var(--glow-cyan)";
    case "DRILL":       return "var(--mars-orange)";
    case "SCAN":        return "var(--glow-purple)";
    case "CHARGE":      return "var(--glow-green)";
    case "TURN":        return "#60a5fa";
    case "GET_POSITION": return "#fbbf24";
    case "LOG":         return "var(--text-secondary)";
    default:            return "var(--text-muted)";
  }
}

function getTypeIcon(type: LogEntry["type"], action?: string): string {
  if (type === "error")   return "✕";
  if (type === "system")  return "◈";
  if (type === "info")    return "ℹ";
  if (type === "command") return "❯";
  if (type === "output")  return " ";
  switch (action) {
    case "DRIVE":  return "➤";
    case "DRILL":  return "⛏";
    case "SCAN":   return "◉";
    case "CHARGE": return "⚡";
    case "TURN":   return "↻";
    case "LOG":    return "▸";
    default:       return "●";
  }
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const HELP_MESSAGE = `══════════════════════════════════════════════════════════════
CURRENT MISSION TASK: Sector 3×3 Geological Survey
══════════════════════════════════════════════════════════════
Objectives:
  1. Rover deployed at central Base Station (1, 1).
  2. Navigate 1 tile NORTH to (1, 0) to detect Lithium Brine.
  3. Scan subsurface vein and extract crystals with rover.drill().
  4. Navigate EAST to (2, 1) to harvest Titanium Matrix reserves.

══════════════════════════════════════════════════════════════
AVAILABLE SDK FUNCTIONS
══════════════════════════════════════════════════════════════
  • rover.drive(dir)       Move 1 tile ("NORTH"|"SOUTH"|"EAST"|"WEST")
  • rover.drill()          Extract minerals & samples at current tile
  • rover.scan()           Scan tile subsurface for veins & reserves
  • rover.charge(amt=10)   Recharge battery (+10% power)
  • rover.turn_left()      Rotate rover facing 90° CCW
  • rover.turn_right()     Rotate rover facing 90° CW
  • rover.get_position()   Query current (col, row) coordinates
  • rover.log(msg)         Send custom log message to terminal

TERMINAL COMMANDS:
  /help                    Show this mission guide & SDK reference
  /task                    Display current mission objectives
  /run                     Execute the script in the code editor
  /status                  Print real-time rover telemetry
  /clear                   Clear terminal screen
══════════════════════════════════════════════════════════════`;

export default function Terminal({
  logs,
  onClear,
  onRunScript,
  roverState,
}: TerminalProps) {
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [customOutputs, setCustomOutputs] = useState<CommandOutput[]>([
    {
      id: "init-banner",
      type: "system",
      text: "Mars Rover Mission Terminal [v2.4.0-sector3x3]\nType /help for current mission task and SDK functions reference.",
      timestamp: Date.now(),
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll when logs or customOutputs change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, customOutputs]);

  const handleCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    // Add to command history
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIdx(-1);

    const now = Date.now();
    const userEntry: CommandOutput = {
      id: `cmd-${now}-${Math.random()}`,
      type: "command",
      text: trimmed,
      timestamp: now,
    };

    const cmdLower = trimmed.toLowerCase();

    if (cmdLower === "/help" || cmdLower === "help" || cmdLower === "?") {
      setCustomOutputs((prev) => [
        ...prev,
        userEntry,
        {
          id: `out-${now}-${Math.random()}`,
          type: "output",
          text: HELP_MESSAGE,
          timestamp: now,
        },
      ]);
    } else if (cmdLower === "/task" || cmdLower === "task") {
      const taskMsg = `Current Mission: Sector 3×3 Geological Survey
Target: Start at (1, 1). Move NORTH to (1, 0) for Lithium Brine. Drill twice, then survey EAST to (2, 1) for Titanium Matrix.`;
      setCustomOutputs((prev) => [
        ...prev,
        userEntry,
        {
          id: `out-${now}-${Math.random()}`,
          type: "output",
          text: taskMsg,
          timestamp: now,
        },
      ]);
    } else if (cmdLower === "/run" || cmdLower === "run") {
      setCustomOutputs((prev) => [
        ...prev,
        userEntry,
        {
          id: `out-${now}-${Math.random()}`,
          type: "system",
          text: "▶ Transmitting script to Mars rover for execution...",
          timestamp: now,
        },
      ]);
      if (onRunScript) onRunScript();
    } else if (cmdLower === "/clear" || cmdLower === "clear") {
      setCustomOutputs([]);
      onClear();
    } else if (cmdLower === "/status" || cmdLower === "status") {
      const statusMsg = roverState
        ? `ROVER TELEMETRY:
  Position:   Col ${roverState.col}, Row ${roverState.row}
  Facing:     ${roverState.facing}
  Battery:    ${roverState.battery}%
  Cargo Hold: ${roverState.minerals} / ${roverState.cargoCapacity} units
  Status:     ${roverState.isMoving ? "Driving" : roverState.isDrilling ? "Excavating" : "Idle"}`
        : "Telemetry stream offline.";
      setCustomOutputs((prev) => [
        ...prev,
        userEntry,
        {
          id: `out-${now}-${Math.random()}`,
          type: "output",
          text: statusMsg,
          timestamp: now,
        },
      ]);
    } else {
      setCustomOutputs((prev) => [
        ...prev,
        userEntry,
        {
          id: `out-${now}-${Math.random()}`,
          type: "output",
          text: `Command not found: '${trimmed}'. Type /help to view available commands and SDK functions.`,
          timestamp: now,
        },
      ]);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(inputVal);
      setInputVal("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx !== -1) {
        const nextIdx = historyIdx + 1;
        if (nextIdx >= history.length) {
          setHistoryIdx(-1);
          setInputVal("");
        } else {
          setHistoryIdx(nextIdx);
          setInputVal(history[nextIdx] || "");
        }
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "#080b11",
        fontFamily: "var(--font-code)",
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Minimalist Terminal Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
          background: "#0b0f17",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--glow-cyan)", fontWeight: 600 }}>
            terminal:rover@control
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              padding: "1px 6px",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: 3,
            }}
          >
            type <b style={{ color: "var(--glow-cyan)" }}>/help</b>
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCustomOutputs([]);
            onClear();
          }}
          title="Clear Terminal (/clear)"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 10,
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: 3,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--text-primary)")}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-muted)")}
        >
          Clear
        </button>
      </div>

      {/* Terminal Stream Output */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 12px",
          fontSize: 11.5,
          lineHeight: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {/* Render custom terminal outputs */}
        {customOutputs.map((item) => (
          <div key={item.id} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {item.type === "command" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--glow-cyan)" }}>
                <span style={{ color: "var(--glow-green)", fontWeight: 600 }}>rover@mars:~$</span>
                <span>{item.text}</span>
              </div>
            ) : item.type === "system" ? (
              <div style={{ color: "var(--glow-cyan-dim)", fontStyle: "italic" }}>
                {item.text}
              </div>
            ) : (
              <div
                style={{
                  color: "#d1d5db",
                  background: "rgba(0, 212, 255, 0.03)",
                  padding: "6px 8px",
                  borderRadius: 4,
                  borderLeft: "2px solid var(--glow-cyan)",
                  marginTop: 2,
                  marginBottom: 2,
                }}
              >
                {item.text}
              </div>
            )}
          </div>
        ))}

        {/* Render real-time rover execution logs */}
        {logs.map((log) => {
          const isError = log.type === "error";
          const isSystem = log.type === "system";
          const color = isError
            ? "var(--glow-red)"
            : isSystem
            ? "var(--text-muted)"
            : getActionColor(log.action);

          return (
            <div
              key={log.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                color: isError ? "var(--glow-red)" : isSystem ? "var(--text-muted)" : "#c9d1d9",
              }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: 10, flexShrink: 0 }}>
                {formatTime(log.timestamp)}
              </span>
              <span style={{ color, flexShrink: 0 }}>
                {getTypeIcon(log.type, log.action)}
              </span>
              {log.action && (
                <span style={{ color, fontWeight: 600, flexShrink: 0 }}>
                  [{log.action}]
                </span>
              )}
              <span style={{ wordBreak: "break-word" }}>{log.message}</span>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Interactive Command Input Line */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          borderTop: "1px solid rgba(255, 255, 255, 0.07)",
          background: "#0a0e16",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "var(--glow-green)",
            fontWeight: 700,
            fontSize: 12,
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          rover@mars:~$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="type /help or /run..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontFamily: "var(--font-code)",
            fontSize: 12,
          }}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
