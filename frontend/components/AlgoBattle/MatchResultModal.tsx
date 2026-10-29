"use client";

import Link from "next/link";
import { useState } from "react";

import type { BattleResult, PlayerResult } from "./types";

function formatMemory(value: number) {
  if (!value) return "—";
  if (value >= 1024) return `${(value / 1024).toFixed(2)} MB`;
  return `${value.toFixed(1)} KB`;
}

function formatTime(value: number) {
  if (!value) return "—";
  return `${value.toFixed(2)} ms`;
}

function StatRow({
  label,
  left,
  right,
  better,
}: {
  label: string;
  left: string;
  right: string;
  better?: "left" | "right" | null;
}) {
  return (
    <div className="ab-result-row">
      <span className={better === "left" ? "ab-result-good" : ""}>{left}</span>
      <em>{label}</em>
      <span className={better === "right" ? "ab-result-good" : ""}>{right}</span>
    </div>
  );
}

function metricWinner(
  p1: number,
  p2: number,
  lowerIsBetter = true
): "left" | "right" | null {
  if (!p1 || !p2) return null;
  if (p1 === p2) return null;
  if (lowerIsBetter) return p1 < p2 ? "left" : "right";
  return p1 > p2 ? "left" : "right";
}

function ResultColumn({ player }: { player: PlayerResult }) {
  return (
    <div className="ab-result-player">
      <span className={`ab-result-avatar ab-result-avatar--${player.side}`}>
        {player.username.slice(0, 1).toUpperCase()}
      </span>
      <strong>{player.username}</strong>
      <span>{player.language.toUpperCase()}</span>
      <div className="ab-result-hp">
        <div>
          <span style={{ width: `${(player.hp / player.max_hp) * 100}%` }} />
        </div>
        <b>{Math.round(player.hp)} HP</b>
      </div>
    </div>
  );
}

export default function MatchResultModal({
  result,
  selfId,
  onClose,
}: {
  result: BattleResult;
  selfId: number;
  onClose: () => void;
}) {
  const [revealCode, setRevealCode] = useState(false);
  const selfSide = result.p1.user_id === selfId ? "p1" : "p2";
  const self = selfSide === "p1" ? result.p1 : result.p2;
  const opponent = selfSide === "p1" ? result.p2 : result.p1;
  const selfWon = result.winner === selfSide;
  const isDraw = result.winner === "draw";
  const rating = result.ratings?.[String(selfId)];

  return (
    <div className="ab-modal-backdrop" role="presentation">
      <div className="ab-result-modal glass-panel" role="dialog" aria-modal="true">
        <header
          className={`ab-result-header ${
            isDraw
              ? "ab-result-header--draw"
              : selfWon
                ? "ab-result-header--win"
                : "ab-result-header--loss"
          }`}
        >
          <span className="ab-result-kicker">
            {result.problem_title ?? result.problem?.title} · MATCH REPORT
          </span>
          <h2>{isDraw ? "DRAW" : selfWon ? "VICTORY" : "DEFEAT"}</h2>
          <p>
            {isDraw
              ? "Both fighters survived the benchmark clash."
              : selfWon
                ? `You out-coded ${opponent.username}.`
                : `${opponent.username} took this duel. Study the numbers and hit rematch.`}
          </p>
          {rating && (
            <span
              className={`ab-rating-chip ${
                rating.delta >= 0 ? "ab-rating-chip--up" : "ab-rating-chip--down"
              }`}
            >
              {rating.delta >= 0 ? "+" : ""}
              {rating.delta} MMR · {rating.after} · {rating.rank_tier}
            </span>
          )}
        </header>

        <div className="ab-result-players">
          <ResultColumn player={result.p1} />
          <div className="ab-result-vs">VS</div>
          <ResultColumn player={result.p2} />
        </div>

        <div className="ab-result-grid">
          <div className="ab-result-comparison">
            <StatRow
              label="BIG-O"
              left={result.p1.big_o}
              right={result.p2.big_o}
              better={
                result.p1.big_o === result.p2.big_o
                  ? null
                  : result.p1.all_passed
                    ? "left"
                    : "right"
              }
            />
            <StatRow
              label="CPU TIME"
              left={formatTime(result.p1.time_ms)}
              right={formatTime(result.p2.time_ms)}
              better={metricWinner(result.p1.time_ms, result.p2.time_ms)}
            />
            <StatRow
              label="PEAK RAM"
              left={formatMemory(result.p1.memory_kb)}
              right={formatMemory(result.p2.memory_kb)}
              better={metricWinner(result.p1.memory_kb, result.p2.memory_kb)}
            />
            <StatRow
              label="TESTS"
              left={`${result.p1.passed_count}/${result.p1.total_count}`}
              right={`${result.p2.passed_count}/${result.p2.total_count}`}
              better={metricWinner(
                result.p1.passed_count,
                result.p2.passed_count,
                false
              )}
            />
            <StatRow
              label="DAMAGE"
              left={result.p1.damage_dealt.toFixed(0)}
              right={result.p2.damage_dealt.toFixed(0)}
              better={metricWinner(
                result.p1.damage_dealt,
                result.p2.damage_dealt,
                false
              )}
            />
            <StatRow
              label="SHIELD"
              left={result.p1.shield.toFixed(0)}
              right={result.p2.shield.toFixed(0)}
              better={metricWinner(result.p1.shield, result.p2.shield, false)}
            />
          </div>

          <div className="ab-result-log">
            <h3>Combat log</h3>
            <div>
              {result.combatLog.map((event, index) => (
                <article key={`${event.type}-${index}`}>
                  <span className={`ab-log-icon ab-log-icon--${event.type}`}>
                    {event.type === "attack"
                      ? "!"
                      : event.type === "shield"
                        ? "#"
                        : event.type === "finish"
                          ? "*"
                          : "-"}
                  </span>
                  <p>{event.message}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        {self.error && (
          <pre className="ab-result-error">{self.error}</pre>
        )}

        {revealCode && (
          <div className="ab-code-reveal">
            <div>
              <h3>Your solution</h3>
              <pre>{self.code || "// no submission"}</pre>
            </div>
            <div>
              <h3>{opponent.username}&apos;s solution</h3>
              <pre>{opponent.code || "// no submission"}</pre>
            </div>
          </div>
        )}

        <footer className="ab-result-actions">
          <button
            type="button"
            className="ab-btn ab-btn--ghost"
            onClick={() => setRevealCode((value) => !value)}
          >
            {revealCode ? "Hide code" : "View opponent code"}
          </button>
          <button type="button" className="ab-btn ab-btn--ghost" onClick={onClose}>
            Watch arena
          </button>
          <Link href="/algo-battle" className="ab-btn ab-btn--primary">
            New duel
          </Link>
        </footer>
      </div>
    </div>
  );
}
