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
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<"quick" | "create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      token ? getMyRating(token).catch(() => null) : Promise.resolve(null),
      getLeaderboard(8).catch(() => []),
    ]).then(([myRating, leaderboard]) => {
      if (cancelled) return;
      setRating(myRating);
      setLeaders(leaderboard);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const enterRoom = (roomCode: string) => {
    router.push(`/algo-battle/${roomCode.toUpperCase()}`);
  };

  const handleQuickMatch = async () => {
    if (!token || busy) return;
    setBusy("quick");
    setError(null);
    try {
      const room = await quickMatch(token);
      enterRoom(room.roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find a match.");
      setBusy(null);
    }
  };

  const handleCreate = async () => {
    if (!token || busy) return;
    setBusy("create");
    setError(null);
    try {
      const room = await createRoom(token);
      enterRoom(room.roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a room.");
      setBusy(null);
    }
  };

  const handleJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || busy) return;
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError("Room codes are 6 characters long.");
      return;
    }
    setBusy("join");
    setError(null);
    try {
      await joinRoom(token, code);
      enterRoom(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join that room.");
      setBusy(null);
    }
  };

  return (
    <main className="ab-lobby">
      <div className="ab-lobby-bg" aria-hidden="true">
        <span className="ab-orbit ab-orbit--one" />
        <span className="ab-orbit ab-orbit--two" />
        <span className="ab-glow ab-glow--cyan" />
        <span className="ab-glow ab-glow--orange" />
      </div>

      <div className="ab-lobby-grid">
        <section className="ab-lobby-hero">
          <span className="ab-eyebrow">GAME 02 · REAL-TIME DUEL</span>
          <h1>
            ALGO
            <span>BATTLE</span>
          </h1>
          <p className="ab-lobby-lede">
            Two coders. One problem. The fastest, leanest algorithm lands the
            killing blow. CPU time becomes attack power, peak memory becomes a
            shield, and every failed test costs HP.
          </p>

          <div className="ab-lobby-stats">
            <article>
              <strong>{rating ? rating.elo_rating : "1200"}</strong>
              <span>{rating ? `${rating.rank_tier} MMR` : "starting MMR"}</span>
            </article>
            <article>
              <strong>{rating ? rating.wins : 0}</strong>
              <span>duels won</span>
            </article>
            <article>
              <strong>{rating ? rating.matches_played : 0}</strong>
              <span>matches played</span>
            </article>
          </div>

          <div className="ab-lobby-steps">
            <div>
              <span>01</span>
              <p>Get the same algorithm problem as your opponent.</p>
            </div>
            <div>
              <span>02</span>
              <p>Run sample tests, then lock in your best solution.</p>
            </div>
            <div>
              <span>03</span>
              <p>Watch time, memory and Big-O decide the winner.</p>
            </div>
          </div>
        </section>

        <section className="ab-lobby-panel glass-panel glass-panel--glow">
          {!user ? (
            <div className="ab-lobby-auth">
              <span className="ab-eyebrow">PILOT REQUIRED</span>
              <h2>Sign in to enter the arena</h2>
              <p>
                Your Rover Lab account carries your Algo Battle rating, win
                record and rank tier.
              </p>
              <div className="ab-lobby-auth-actions">
                <Link href="/login?next=/algo-battle" className="ab-btn ab-btn--primary">
                  Sign in
                </Link>
                <Link href="/register?next=/algo-battle" className="ab-btn ab-btn--ghost">
                  Create account
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="ab-lobby-panel-head">
                <div>
                  <span className="ab-eyebrow">MATCHMAKING</span>
                  <h2>Find your opponent</h2>
                </div>
                <span className="ab-online-pill">
                  <i />
                  {user.username}
                </span>
              </div>

              {error && <p className="ab-lobby-error">{error}</p>}

              <button
                type="button"
                className="ab-quick-match"
                onClick={handleQuickMatch}
                disabled={busy !== null}
              >
                <span className="ab-quick-icon">VS</span>
                <span>
                  <strong>
                    {busy === "quick" ? "Searching…" : "Quick match"}
                  </strong>
                  <em>Pair with the next available coder</em>
                </span>
                <b>{busy === "quick" ? "···" : "→"}</b>
              </button>

              <div className="ab-lobby-divider">
                <span />
                or duel a friend
                <span />
              </div>

              <button
                type="button"
                className="ab-btn ab-btn--ghost ab-lobby-create"
                onClick={handleCreate}
                disabled={busy !== null}
              >
                {busy === "create" ? "Creating room…" : "Create private room"}
              </button>

              <form className="ab-join-form" onSubmit={handleJoin}>
                <label htmlFor="room-code">Join with room code</label>
                <div>
                  <input
                    id="room-code"
                    value={joinCode}
                    onChange={(event) =>
                      setJoinCode(
                        event.target.value
                          .replace(/[^a-zA-Z0-9]/g, "")
                          .slice(0, 6)
                          .toUpperCase()
                      )
                    }
                    placeholder="A1B2C3"
                    maxLength={6}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="submit"
                    className="ab-btn ab-btn--primary"
                    disabled={busy !== null || joinCode.length !== 6}
                  >
                    {busy === "join" ? "Joining…" : "Join"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>

      <section className="ab-leaderboard">
        <div className="ab-leaderboard-head">
          <div>
            <span className="ab-eyebrow">SEASON RANKINGS</span>
            <h2>Top duelists</h2>
          </div>
          <span>Elo updates after every match</span>
        </div>

        {leaders.length === 0 ? (
          <p className="ab-leaderboard-empty">
            No rated duelists yet. Win the first match and claim the top spot.
          </p>
        ) : (
          <div className="ab-leaderboard-list">
            {leaders.map((entry, index) => (
              <article key={entry.user_id}>
                <span className="ab-rank">#{index + 1}</span>
                <strong>{entry.username ?? `Player ${entry.user_id}`}</strong>
                <span className={`ab-tier ab-tier--${entry.rank_tier.toLowerCase()}`}>
                  {entry.rank_tier}
                </span>
                <em>{entry.elo_rating} MMR</em>
                <small>
                  {entry.wins}W · {entry.losses}L
                </small>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
