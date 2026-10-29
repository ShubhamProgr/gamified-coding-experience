"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/AuthContext";
import BattleCanvas from "@/components/AlgoBattle/BattleCanvas";
import BattleEditor from "@/components/AlgoBattle/BattleEditor";
import MatchResultModal from "@/components/AlgoBattle/MatchResultModal";
import ProblemView from "@/components/AlgoBattle/ProblemView";
import TestConsole from "@/components/AlgoBattle/TestConsole";
import { useBattleSocket } from "@/components/AlgoBattle/useBattleSocket";

export default function AlgoBattleRoomPage() {
  const { user, token } = useAuth();
  const { roomId } = useParams<{ roomId: string }>();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [showResult, setShowResult] = useState(false);
  const loadedProblem = useRef<string | null>(null);
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
    roomId: roomId ?? "",
    token,
    userId: user?.id ?? null,
    username: user?.username ?? null,
    enabled: Boolean(user && token && roomId),
  });

  const self = useMemo(
    () => room?.players.find((player) => player.user_id === user?.id),
    [room?.players, user?.id],
  );
  const opponent = useMemo(
    () => room?.players.find((player) => player.user_id !== user?.id),
    [room?.players, user?.id],
  );
  const submitted = Boolean(self?.submitted);

  useEffect(() => {
    if (!match || loadedProblem.current === match.problem.id) return;
    loadedProblem.current = match.problem.id;
    setCode(match.problem.starterCode[language] ?? "");
  }, [match, language]);

  if (!user || !token) {
    return (
      <main className="ab-arena ab-arena--centered">
        <section className="ab-auth-needed glass-panel">
          <span className="ab-eyebrow">ALGO BATTLE</span>
          <h1>Sign in to join this room</h1>
          <Link className="ab-btn ab-btn--primary" href={`/login?next=/algo-battle/${roomId}`}>
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="ab-arena ab-arena--centered">
        <section className="ab-auth-needed glass-panel">
          <span className="ab-spinner" />
          <h1>Connecting…</h1>
          <p>{error ?? "Opening the battle room."}</p>
          <Link className="ab-btn ab-btn--ghost" href="/algo-battle">Back to lobby</Link>
        </section>
      </main>
    );
  }

  if (room.status === "WAITING" || room.status === "COUNTDOWN") {
    return (
      <main className="ab-arena ab-arena--centered">
        <section className="ab-waiting glass-panel">
          <span className="ab-eyebrow">{room.status === "COUNTDOWN" ? "GET READY" : "ROOM CREATED"}</span>
          <h1>{room.status === "COUNTDOWN" ? countdown ?? 5 : "Waiting for a player"}</h1>
          <p>
            {room.status === "COUNTDOWN"
              ? "The problem is loading. Battle starts now."
              : "Share this code with your opponent."}
          </p>
          <button type="button" className="ab-room-code" onClick={() => navigator.clipboard.writeText(room.roomCode)}>
            <span>{room.roomCode}</span>
            <em>copy room code</em>
          </button>
          <div className="ab-waiting-slots">
            {[0, 1].map((index) => {
              const player = room.players[index];
              return (
                <div key={index} className={`ab-waiting-slot${player ? "" : " ab-waiting-slot--empty"}`}>
                  <strong>{player?.username ?? "Open slot"}</strong>
                  <em>{player ? (player.user_id === user.id ? "you" : "opponent") : "waiting"}</em>
                </div>
              );
            })}
          </div>
          {room.status === "WAITING" && (
            <button
              type="button"
              className="ab-btn ab-btn--primary"
              onClick={() => setReady(true)}
              disabled={room.players.length < 2 || Boolean(self?.ready)}
            >
              {self?.ready ? "Ready — waiting for opponent" : room.players.length < 2 ? "Waiting for opponent…" : "Ready"}
            </button>
          )}
          <Link className="ab-btn ab-btn--ghost" href="/algo-battle">Leave room</Link>
          {error && <p className="ab-inline-error">{error}</p>}
        </section>
      </main>
    );
  }

  const problem = match?.problem ?? room.problem ?? result?.problem;
  const handleSubmit = () => {
    if (code.trim() && window.confirm("Submit your solution? You cannot edit it afterward.")) {
      submitSolution(code, language);
    }
  };

  return (
    <main className="ab-arena">
      <header className="ab-hud glass-panel">
        <div className="ab-hud-brand">
          <span className="ab-eyebrow">ALGO BATTLE</span>
          <strong>Room {room.roomCode}</strong>
        </div>
        <div className="ab-hud-players">
          <span>{user.username}</span>
          <b>VS</b>
          <span>{opponent?.username ?? "Waiting…"}</span>
        </div>
        <div className="ab-hud-status">
          <span>{connection === "open" ? "Connected" : "Reconnecting…"}</span>
          <strong>{room.status === "FINISHED" ? "Finished" : `${Math.ceil(room.remainingSeconds / 60)} min left`}</strong>
        </div>
      </header>

      <div className="ab-arena-main">
        <section className="ab-arena-problem">
          {problem && <ProblemView problem={problem} />}
        </section>
        <section className="ab-arena-workbench">
          <BattleEditor
            value={result && result.p1.user_id === user.id ? result.p1.code : code}
            onChange={setCode}
            language={language}
            onLanguageChange={(next) => {
              setLanguage(next);
              setCode(problem?.starterCode[next] ?? "");
            }}
            readOnly={submitted || room.status !== "CODING"}
            running={testPending}
            submitted={submitted}
            onRun={() => code.trim() && runTests(code, language)}
            onSubmit={handleSubmit}
          />
        </section>
        <aside className="ab-arena-side">
          <BattleCanvas
            result={result}
            active={room.status === "CODING" || room.status === "EVALUATION"}
            onClashComplete={() => setShowResult(true)}
          />
          <TestConsole result={testPayload?.result ?? null} running={testPending} evaluation={evaluation} />
          <div className="ab-side-status">
            <div><span>Opponent</span><strong>{opponent?.username ?? "—"}</strong><em>{opponent?.submitted ? "submitted" : opponent?.status ?? "waiting"}</em></div>
            <div><span>You</span><strong>{submitted ? "Submitted" : "Coding"}</strong><em>{self?.passed_tests ? `${self.passed_tests}/${self.total_tests} tests passed` : "run tests before submitting"}</em></div>
          </div>
          {room.status === "FINISHED" && result && (
            <button type="button" className="ab-btn ab-btn--primary" onClick={() => setShowResult(true)}>View result</button>
          )}
          {room.status === "CODING" && (
            <button type="button" className="ab-forfeit" onClick={() => window.confirm("Forfeit this battle?") && forfeit()}>
              Forfeit battle
            </button>
          )}
          {rating && <small>{rating.elo_rating} MMR · {rating.rank_tier}</small>}
        </aside>
      </div>

      {showResult && result && (
        <MatchResultModal result={result} selfId={user.id} onClose={() => setShowResult(false)} />
      )}
      {error && <p className="ab-toast">{error}</p>}
    </main>
  );
}
