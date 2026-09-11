"use client";

import { useEffect, useRef } from "react";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: "action" | "error" | "info" | "system";
  action?: string;
  message: string;
  raw?: object;
}

interface ConsoleOutputProps {
  logs: LogEntry[];
  onClear: () => void;
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
  if (type === "error")  return "✕";
  if (type === "system") return "◈";
  if (type === "info")   return "◆";
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

export default function ConsoleOutput({ logs, onClear }: ConsoleOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "var(--space-bg)",
      }}
    >
      {/* Console header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid var(--space-border)",
          background: "var(--space-mid)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: logs.length > 0 ? "var(--glow-green)" : "var(--text-muted)",
              boxShadow: logs.length > 0 ? "0 0 8px var(--glow-green)" : "none",
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-ui)",
            }}
          >
            Mission Log
          </span>
          {logs.length > 0 && (
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                background: "rgba(0,212,255,0.12)",
                color: "var(--glow-cyan)",
                border: "1px solid rgba(0,212,255,0.2)",
              }}
            >
              {logs.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={logs.length === 0}
          title="Clear console"
          style={{
            background: "transparent",
            border: "none",
            cursor: logs.length === 0 ? "default" : "pointer",
            color: logs.length === 0 ? "var(--text-muted)" : "var(--text-secondary)",
            fontSize: 11,
            fontFamily: "var(--font-ui)",
            padding: "2px 6px",
            borderRadius: "var(--radius-sm)",
            transition: "color 0.15s",
          }}
        >
          Clear
        </button>
      </div>

      {/* Log entries */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 0",
          fontFamily: "var(--font-code)",
          fontSize: 12,
        }}
      >
        {logs.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 8,
              color: "var(--text-muted)",
              fontSize: 12,
              fontFamily: "var(--font-ui)",
            }}
          >
            <span style={{ fontSize: 24, opacity: 0.4 }}>▸</span>
            <span>Run your code to see the mission log</span>
          </div>
        ) : (
          logs.map((log) => (
            <LogLine key={log.id} log={log} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function LogLine({ log }: { log: LogEntry }) {
  const isError = log.type === "error";
  const isSystem = log.type === "system";
  const color = isError
    ? "var(--glow-red)"
    : isSystem
    ? "var(--text-muted)"
    : getActionColor(log.action);

  return (
    <div
      className="animate-fade-in"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "3px 12px",
        borderLeft: isError ? "2px solid var(--glow-red)" : "2px solid transparent",
        background: isError ? "rgba(255,68,68,0.04)" : "transparent",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isError) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)";
      }}
      onMouseLeave={(e) => {
        if (!isError) (e.currentTarget as HTMLDivElement).style.background = "transparent";
      }}
    >
      {/* Timestamp */}
      <span style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 1, flexShrink: 0 }}>
        {formatTime(log.timestamp)}
      </span>

      {/* Icon */}
      <span style={{ color, fontSize: 11, marginTop: 1, flexShrink: 0 }}>
        {getTypeIcon(log.type, log.action)}
      </span>

      {/* Action badge */}
      {log.action && log.type === "action" && (
        <span
          style={{
            padding: "0px 6px",
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            background: `${color}18`,
            color,
            border: `1px solid ${color}30`,
            flexShrink: 0,
            fontFamily: "var(--font-ui)",
          }}
        >
          {log.action}
        </span>
      )}

      {/* Message */}
      <span
        style={{
          color: isError ? "var(--glow-red)" : isSystem ? "var(--text-muted)" : "var(--text-code)",
          wordBreak: "break-all",
          lineHeight: 1.5,
        }}
      >
        {log.message}
      </span>
    </div>
  );
}
