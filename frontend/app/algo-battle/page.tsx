"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthContext";
import type { BattleRating } from "@/components/AlgoBattle/types";
import {
  createRoom,
  getLeaderboard,
  getMyRating,
  joinRoom,
  quickMatch,
} from "@/lib/algoBattleApi";

export default function AlgoBattleLobbyPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [rating, setRating] = useState<BattleRating | null>(null);
  const [leaders, setLeaders] = useState<BattleRating[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"quick" | "create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      token ? getMyRating(token).catch(() => null) : Promise.resolve(null),
      getLeaderboard(8).catch(() => []),
    ]).then(([nextRating, nextLeaders]) => {
      if (!cancelled) {
        setRating(nextRating);
        setLeaders(nextLeaders);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const enter = (roomCode: string) =>
    router.push(`/algo-battle/${roomCode.toUpperCase()}`);

  const start = async (action: "quick" | "create") => {
    if (!token || busy) return;
    setBusy(action);
    setError(null);
    try {
      const room =
        action === "quick" ? await quickMatch(token) : await createRoom(token);
      enter(room.roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a battle.");
      setBusy(null);
    }
  };

  const handleJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || busy) return;
    const roomCode = code.trim().toUpperCase();
    if (roomCode.length !== 6) {
      setError("Enter a 6-character room code.");
      return;
    }
    setBusy("join");
    setError(null);
    try {
      await joinRoom(token, roomCode);
      enter(roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join that room.");
      setBusy(null);
    }
  };

  return (
    <main className="ab-lobby">
      <div className="ab-lobby-grid">
        <h1 className="ab-lobby-title">Algo Battle</h1>
        <div className="ab-lobby-content">
          {user && (
            <section className="ab-pilot-card glass-panel">
              <span className="ab-eyebrow">PILOT INFO</span>
              <h2>{user.username}</h2>
              <span className="ab-pilot-rank">{rating?.rank_tier ?? "Bronze"} pilot</span>
              <div className="ab-pilot-stats">
                <div><strong>{rating?.matches_played ?? 0}</strong><span>Matches</span></div>
                <div><strong>{rating?.wins ?? 0}</strong><span>Won</span></div>
                <div><strong>{rating?.losses ?? 0}</strong><span>Lost</span></div>
                <div><strong>{rating?.submissions ?? 0}</strong><span>Submissions</span></div>
              </div>
            </section>
          )}
          <section className="ab-lobby-panel glass-panel glass-panel--glow">
          {!user ? (
            <div className="ab-lobby-auth">
              <span className="ab-eyebrow">READY?</span>
              <h2>Sign in to play</h2>
              <p>Create a room or join a friend after signing in.</p>
              <div className="ab-lobby-auth-actions">
                <Link className="ab-btn ab-btn--primary" href="/login?next=/algo-battle">
                  Sign in
                </Link>
                <Link className="ab-btn ab-btn--ghost" href="/register?next=/algo-battle">
                  Register
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="ab-lobby-panel-head">
                <div>
                  <span className="ab-eyebrow">WELCOME, {user.username}</span>
                  <h2>Start a battle</h2>
                </div>
              </div>
              {error && <p className="ab-lobby-error">{error}</p>}
              <button
                type="button"
                className="ab-quick-match"
                onClick={() => start("quick")}
                disabled={busy !== null}
              >
                <span className="ab-quick-icon">VS</span>
                <span>
                  <strong>{busy === "quick" ? "Finding player…" : "Quick match"}</strong>
                  <em>Play against the next available coder</em>
                </span>
                <b>→</b>
              </button>
              <div className="ab-lobby-divider"><span />or<span /></div>
              <button
                type="button"
                className="ab-btn ab-btn--ghost ab-lobby-create"
                onClick={() => start("create")}
                disabled={busy !== null}
              >
                {busy === "create" ? "Creating…" : "Create private room"}
              </button>
              <form className="ab-join-form" onSubmit={handleJoin}>
                <label htmlFor="room-code">Join with code</label>
                <div>
                  <input
                    id="room-code"
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase())
                    }
                    placeholder="A1B2C3"
                    maxLength={6}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="ab-btn ab-btn--primary"
                    disabled={busy !== null || code.length !== 6}
                  >
                    {busy === "join" ? "Joining…" : "Join"}
                  </button>
                </div>
              </form>
            </>
          )}
          </section>
        </div>
      </div>

      <section className="ab-leaderboard">
        <div className="ab-leaderboard-head">
          <div>
            <span className="ab-eyebrow">LEADERBOARD</span>
            <h2>Top coders</h2>
          </div>
          <span>Updated after each match</span>
        </div>
        <div className="ab-leaderboard-list">
          {leaders.map((entry, index) => (
            <article key={entry.user_id}>
              <span className="ab-rank">#{index + 1}</span>
              <strong>{entry.username ?? `Player ${entry.user_id}`}</strong>
              <span className="ab-tier">{entry.rank_tier}</span>
              <em>{entry.elo_rating} MMR</em>
              <small>{entry.wins}W · {entry.losses}L</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
