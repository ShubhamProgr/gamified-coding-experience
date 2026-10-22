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
  onShowCode?: () => void;
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

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const HELP_MESSAGE = `CURRENT MISSION — Sector 9×9 Geological Survey

Objectives
  1. Start at the central Base Station.
  2. Drive FRONT and drill to extract Cuprion.
  3. Scan nearby tiles for Pythorium deposits.
  4. Explore the sector to find rare Javium.
  5. Fill your cargo hold before the battery runs out.

Rover SDK
  rover.drive(dir)      Move one tile: FRONT | BACK | LEFT | RIGHT
  rover.drill()         Extract minerals at the current tile
  rover.scan()          Scan the current tile for deposits
  rover.charge(amt)     Recharge battery (default +10%)
  rover.turn_left()     Rotate 90° counter-clockwise
  rover.turn_right()    Rotate 90° clockwise
  rover.get_position()  Get current (col, row)
  rover.log(msg)        Print a custom message

Commands
  /help     Show this guide
  /task     Show mission objectives
  /run      Run the editor script
  /status   Print rover telemetry
  /clear    Clear the terminal`;

export default function Terminal({
  logs,
  onClear,
  onRunScript,
  roverState,
  onShowCode,
}: TerminalProps) {
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [customOutputs, setCustomOutputs] = useState<CommandOutput[]>(() => [
    {
      id: "init-banner",
      type: "system",
      text: "Mars Rover Terminal v2.4.0\nType /help to view mission objectives and the SDK reference.",
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
      const taskMsg = `Current Mission: Sector Geological Survey
Target: Collect Cuprion, Pythorium, and Javium. Drill mineral deposits, scan unknown tiles, and keep your battery above zero.`;
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
        height: "100%",
        padding: 10,
        background: "transparent",
        fontFamily: "var(--font-code)",
      }}
      onClick={() => inputRef.current?.focus()}
    >
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
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>
              Terminal
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {onShowCode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowCode();
                }}
                style={{
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
                Code
              </button>
            )}
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
              Clear
            </button>
          </div>
        </div>

        {/* Output */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 12px",
            fontSize: 12,
            lineHeight: 1.6,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {customOutputs.map((item) => (
            <div key={item.id} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {item.type === "command" ? (
                <div style={{ display: "flex", gap: 6, color: "var(--glow-cyan)" }}>
                  <span style={{ color: "var(--glow-green)" }}>❯</span>
                  <span>{item.text}</span>
                </div>
              ) : item.type === "system" ? (
                <div style={{ color: "var(--text-muted)" }}>{item.text}</div>
              ) : (
                <div style={{ color: "var(--text-code)" }}>{item.text}</div>
              )}
            </div>
          ))}

          {/* Real-time rover execution logs */}
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
                  alignItems: "baseline",
                  gap: 6,
                  color: isError ? "var(--glow-red)" : "#c9d1d9",
                }}
              >
                <span style={{ color: "var(--text-muted)", fontSize: 10, flexShrink: 0 }}>
                  {formatTime(log.timestamp)}
                </span>
                {log.action && (
                  <span style={{ color, fontWeight: 600, flexShrink: 0 }}>{log.action}</span>
                )}
                <span style={{ wordBreak: "break-word" }}>{log.message}</span>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 12px",
            borderTop: "1px solid var(--space-border)",
            background: "#0a0e16",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "var(--glow-green)", fontSize: 12, userSelect: "none" }}>❯</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="/help for commands…"
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
    </div>
  );
}
