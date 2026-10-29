"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  BattleMatch,
  BattlePlayer,
  BattleRating,
  BattleResult,
  BattleRoomState,
} from "./types";

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function statusLabel(player: BattlePlayer) {
  if (player.forfeited) return "Forfeited";
  if (player.submitted) return "Locked in";
  if (player.status === "testing") return "Running tests";
  if (player.status === "passed_tests")
    return `${player.passed_tests}/${player.total_tests} tests`;
  if (!player.connected) return "Disconnected";
  return "Coding";
}

function PlayerCard({
  player,
  isSelf,
  result,
  rating,
}: {
  player: BattlePlayer;
  isSelf: boolean;
  result: BattleResult | null;
  rating: BattleRating | null;
}) {
  const sideResult =
    result && result.p1.user_id === player.user_id
      ? result.p1
      : result && result.p2.user_id === player.user_id
        ? result.p2
        : null;
  const hp = sideResult?.hp ?? 100;
  const maxHp = sideResult?.max_hp ?? 100;
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  return (
    <div className={`ab-player-card${isSelf ? " ab-player-card--self" : ""}`}>
      <div className="ab-player-card-top">
        <div className="ab-avatar" aria-hidden="true">
          <span>{player.username.slice(0, 1).toUpperCase()}</span>
        </div>
        <div className="ab-player-identity">
          <strong>
            {player.username}
            {isSelf && <em>you</em>}
          </strong>
          <span>{isSelf && rating ? `${rating.rank_tier} · ${rating.elo_rating} MMR` : statusLabel(player)}</span>
        </div>
        <div className="ab-player-state">
          <span
            className={`ab-state-dot ${
              player.submitted
                ? "ab-state-dot--locked"
                : player.connected
                  ? "ab-state-dot--live"
                  : "ab-state-dot--off"
            }`}
          />
          {statusLabel(player)}
        </div>
      </div>
      <div className="ab-hp-row">
        <span>HP</span>
        <div className="ab-hp-track">
          <div
            className={`ab-hp-fill${hpPercent <= 30 ? " ab-hp-fill--danger" : ""}`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <strong>{Math.round(hp)}</strong>
      </div>
      <div className="ab-player-meta">
        <span>{sideResult ? sideResult.big_o : "—"}</span>
        <span>
          {sideResult && sideResult.time_ms > 0
            ? `${sideResult.time_ms.toFixed(1)} ms`
            : "awaiting benchmark"}
        </span>
        <span>
          {sideResult && sideResult.shield > 0
            ? `shield ${sideResult.shield.toFixed(0)}`
            : "no shield"}
        </span>
      </div>
    </div>
  );
}

export default function BattleHUD({
  room,
  match,
  selfId,
  rating,
  result,
  connection,
}: {
  room: BattleRoomState | null;
  match: BattleMatch | null;
  selfId: number;
  rating: BattleRating | null;
  result: BattleResult | null;
  connection: "connecting" | "open" | "closed";
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remaining = match
    ? Math.max(0, Math.ceil((match.endsAt - now) / 1000))
    : (room?.remainingSeconds ?? room?.durationSeconds ?? 600);

  const players = useMemo(() => {
    const list = room?.players ?? [];
    const self = list.find((player) => player.user_id === selfId);
    const opponent = list.find((player) => player.user_id !== selfId);
    return { self, opponent };
  }, [room?.players, selfId]);

  return (
    <header className="ab-hud">
      <div className="ab-hud-brand">
        <span className="ab-hud-kicker">ALGO BATTLE</span>
        <strong>{room?.problem?.title ?? "Duel arena"}</strong>
        <span className="ab-hud-room">
          room <b>{room?.roomCode ?? "—"}</b>
        </span>
      </div>

      <div className="ab-hud-players">
        {players.self ? (
          <PlayerCard
            player={players.self}
            isSelf
            result={result}
            rating={rating}
          />
        ) : (
          <div className="ab-player-card ab-player-card--empty">Waiting for you…</div>
        )}

        <div className="ab-clock">
          <span className="ab-clock-label">
            {room?.status === "EVALUATION"
              ? "BENCHMARKING"
              : room?.status === "WAITING"
                ? "LOBBY"
                : "TIME LEFT"}
          </span>
          <strong
            className={
              remaining <= 60 && room?.status === "CODING"
                ? "ab-clock-value ab-clock-value--danger"
                : "ab-clock-value"
            }
          >
            {room?.status === "EVALUATION"
              ? "··"
              : formatClock(remaining)}
          </strong>
          <span className={`ab-connection ab-connection--${connection}`}>
            {connection === "open"
              ? "live"
              : connection === "connecting"
                ? "syncing"
                : "offline"}
          </span>
        </div>

        {players.opponent ? (
          <PlayerCard
            player={players.opponent}
            isSelf={false}
            result={result}
            rating={null}
          />
        ) : (
          <div className="ab-player-card ab-player-card--empty">
            <span>Opponent slot open</span>
          </div>
        )}
      </div>
    </header>
  );
}
