"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/AuthContext";
import BattleCanvas from "@/components/AlgoBattle/BattleCanvas";
import BattleEditor from "@/components/AlgoBattle/BattleEditor";
import BattleHUD from "@/components/AlgoBattle/BattleHUD";
import MatchResultModal from "@/components/AlgoBattle/MatchResultModal";
import ProblemView from "@/components/AlgoBattle/ProblemView";
import TestConsole from "@/components/AlgoBattle/TestConsole";
import { useBattleSocket } from "@/components/AlgoBattle/useBattleSocket";

export default function AlgoBattleArenaPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId ?? "";
  const { user, token } = useAuth();
  const userId = user?.id ?? 0;
  const username = user?.username ?? null;

  const {
    connection,
    room,
    match,
    countdown,
    testPayload,
    testPending,
    evaluation,
    result,
    rating,
    error,
    setReady,
    runTests,
    submitSolution,
    forfeit,
  } = useBattleSocket({
    roomId,
    token,
    userId: user?.id ?? null,
    username,
    enabled: Boolean(token && user && roomId),
  });

  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadedProblemRef = useRef<string | null>(null);

  const selfPlayer = useMemo(
    () => room?.players.find((player) => player.user_id === userId) ?? null,
    [room?.players, userId]
  );
  const opponent = useMemo(
    () => room?.players.find((player) => player.user_id !== userId) ?? null,
    [room?.players, userId]
  );
  const submitted = Boolean(selfPlayer?.submitted);
  const displayProblem = match?.problem ?? room?.problem ?? result?.problem ?? null;
  const selfResult = result
    ? result.p1.user_id === userId
      ? result.p1
      : result.p2
    : null;
  const editorCode = selfResult ? selfResult.code : code;
  const editorLanguage = selfResult ? selfResult.language : language;
  const testing = testPending || selfPlayer?.status === "testing";

  useEffect(() => {
    if (!match) {
      loadedProblemRef.current = null;
      return;
    }
    if (loadedProblemRef.current === match.problem.id) return;
    loadedProblemRef.current = match.problem.id;
    setCode(match.problem.starterCode[language] ?? "");
  }, [match, language]);

  useEffect(() => {
    if (!match || room?.status !== "CODING" || submitted) return;
    let sent = false;
    const timer = window.setInterval(() => {
      if (!sent && Date.now() >= match.endsAt) {
        sent = true;
        submitSolution(code, language);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [match, room?.status, submitted, submitSolution, code, language]);

  const handleLanguageChange = useCallback(
    (nextLanguage: string) => {
      setLanguage(nextLanguage);
      if (match) {
        setCode(match.problem.starterCode[nextLanguage] ?? "");
      }
    },
    [match]
  );

  const handleRun = useCallback(() => {
    if (!code.trim() || testPending) return;
    runTests(code, language);
  }, [code, language, testPending, runTests]);

  const handleSubmit = useCallback(() => {
    if (!code.trim()) return;
    const confirmed = window.confirm(
      "Lock in this solution? You cannot edit or resubmit after submitting."
    );
    if (!confirmed) return;
    submitSolution(code, language);
  }, [code, language, submitSolution]);

  const copyRoomCode = async () => {
    if (!room) return;
    const link = `${window.location.origin}/algo-battle/${room.roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleClashComplete = useCallback(() => {
    setShowResult(true);
  }, []);

  if (!user || !token) {
    return (
      <main className="ab-arena ab-arena--centered">
        <div className="ab-auth-needed glass-panel glass-panel--glow">
          <span className="ab-eyebrow">ALGO BATTLE</span>
          <h1>Sign in to enter the arena</h1>
          <p>You need a Rover Lab account to join a live duel.</p>
          <div>
            <Link href={`/login?next=/algo-battle/${roomId}`} className="ab-btn ab-btn--primary">
              Sign in
            </Link>
            <Link href="/algo-battle" className="ab-btn ab-btn--ghost">
              Back to lobby
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="ab-arena ab-arena--centered">
        <div className="ab-auth-needed glass-panel">
          <span className="ab-spinner" />
          <h1>Connecting to duel</h1>
          <p>Syncing the arena state with the match server…</p>
          {error && <p className="ab-inline-error">{error}</p>}
          <Link href="/algo-battle" className="ab-btn ab-btn--ghost">
            Leave arena
          </Link>
        </div>
      </main>
    );
  }

  if (room.status === "WAITING") {
    return (
      <main className="ab-arena ab-arena--centered">
        <section className="ab-waiting glass-panel">
          <div className="ab-waiting-head">
            <span className="ab-eyebrow">DUEL LOBBY</span>
            <h1>Waiting for a rival</h1>
            <p>Share the room code or wait for the matchmaker to fill the slot.</p>
          </div>

          <button type="button" className="ab-room-code" onClick={copyRoomCode}>
            <span>{room.roomCode}</span>
            <em>{copied ? "link copied" : "copy invite link"}</em>
          </button>

          <div className="ab-waiting-slots">
            {[0, 1].map((slot) => {
              const player = room.players[slot];
              if (!player) {
                return (
                  <div key={slot} className="ab-waiting-slot ab-waiting-slot--empty">
                    <span className="ab-spinner" />
                    <strong>Open slot</strong>
                    <em>waiting for opponent</em>
                  </div>
                );
              }
              const isSelf = player.user_id === userId;
              return (
                <div
                  key={slot}
                  className={`ab-waiting-slot${
                    player.ready ? " ab-waiting-slot--ready" : ""
                  }`}
                >
                  <span className="ab-avatar">
                    {player.username.slice(0, 1).toUpperCase()}
                  </span>
                  <strong>
                    {player.username}
                    {isSelf ? " (you)" : ""}
                  </strong>
                  <em>{player.ready ? "ready" : "not ready"}</em>
                </div>
              );
            })}
          </div>

          <div className="ab-waiting-actions">
            {selfPlayer?.ready ? (
              <button type="button" className="ab-btn ab-btn--ghost" disabled>
                Ready · waiting for opponent
              </button>
            ) : (
              <button
                type="button"
                className="ab-btn ab-btn--primary"
                onClick={() => setReady(true)}
                disabled={room.players.length < 2}
              >
                {room.players.length < 2 ? "Waiting for opponent…" : "Ready up"}
              </button>
            )}
            <Link href="/algo-battle" className="ab-btn ab-btn--ghost">
              Leave room
            </Link>
          </div>

          <div className="ab-waiting-note">
            <span>ROOM LOCKED</span>
            The duel starts automatically when both fighters are ready.
          </div>
        </section>

        {error && <p className="ab-toast">{error}</p>}
      </main>
    );
  }

  if (room.status === "COUNTDOWN") {
    return (
      <main className="ab-arena ab-arena--centered">
        <div className="ab-countdown">
          <span className="ab-eyebrow">DUEL STARTING</span>
          <strong>{countdown ?? 5}</strong>
          <p>
            {opponent?.username ?? "Opponent"} vs {username}
          </p>
          <div className="ab-countdown-players">
            {room.players.map((player) => (
              <span key={player.user_id}>
                {player.username}
                {player.user_id === userId ? " (you)" : ""}
              </span>
            ))}
          </div>
        </div>
        {error && <p className="ab-toast">{error}</p>}
      </main>
    );
  }

  return (
    <main className="ab-arena">
      <BattleHUD
        room={room}
        match={match}
        selfId={userId}
        rating={rating}
        result={result}
        connection={connection}
      />

      <div className="ab-arena-main">
        <div className="ab-arena-problem">
          {displayProblem && <ProblemView problem={displayProblem} />}
        </div>

        <div className="ab-arena-workbench">
          <BattleEditor
            value={editorCode}
            onChange={setCode}
            language={editorLanguage}
            onLanguageChange={handleLanguageChange}
            readOnly={submitted || room.status !== "CODING"}
            running={testing}
            submitted={submitted}
            onRun={handleRun}
            onSubmit={handleSubmit}
          />
        </div>

        <aside className="ab-arena-side">
          <BattleCanvas
            result={result}
            active={room.status === "CODING" || room.status === "EVALUATION"}
            onClashComplete={handleClashComplete}
          />

          <TestConsole
            result={testPayload?.result ?? null}
            running={testing}
            evaluation={evaluation}
          />

          <div className="ab-side-status">
            <div>
              <span>Opponent</span>
              <strong>{opponent?.username ?? "—"}</strong>
              <em>
                {opponent?.submitted
                  ? "solution locked"
                  : opponent?.status === "testing"
                    ? "running sample tests"
                    : "coding"}
              </em>
            </div>
            <div>
              <span>Your status</span>
              <strong>{submitted ? "Locked in" : "In combat"}</strong>
              <em>
                {submitted
                  ? "waiting for evaluation"
                  : selfPlayer?.passed_tests
                    ? `${selfPlayer.passed_tests}/${selfPlayer.total_tests} samples`
                    : "no sample run yet"}
              </em>
            </div>
          </div>

          {room.status === "FINISHED" && result && (
            <button
              type="button"
              className="ab-btn ab-btn--primary ab-view-result"
              onClick={() => setShowResult(true)}
            >
              View match report
            </button>
          )}

          {room.status === "CODING" && (
            <button
              type="button"
              className="ab-forfeit"
              onClick={() => {
                if (window.confirm("Forfeit this duel? Your opponent wins.")) {
                  forfeit();
                }
              }}
            >
              Forfeit duel
            </button>
          )}
        </aside>
      </div>

      {(room.status === "EVALUATION" || evaluation) && (
        <div className="ab-eval-overlay">
          <div className="ab-eval-card glass-panel">
            <span className="ab-spinner" />
            <span className="ab-eyebrow">EVALUATION PHASE</span>
            <h2>Benchmarking both solutions</h2>
            <p>
              Running functional and 100,000-element stress suites. CPU time,
              peak memory and complexity are being translated into combat.
            </p>
            <div className="ab-eval-bars">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      {showResult && result && (
        <MatchResultModal
          result={result}
          selfId={userId}
          onClose={() => setShowResult(false)}
        />
      )}

      {error && <p className="ab-toast">{error}</p>}
    </main>
  );
}
