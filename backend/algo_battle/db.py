"""PostgreSQL persistence for Algo Battle.

All helpers are defensive: if the database is temporarily unavailable the duel
still finishes in memory and the frontend receives its result. Failures are
logged and swallowed so gameplay never blocks on persistence.
"""

from __future__ import annotations

import os
from typing import Any

import psycopg2
from psycopg2.extras import Json, RealDictCursor

from .problems import Problem, all_problems

ELO_K_FACTOR = 32
DEFAULT_RATING = 1200


def _connect():
    params: dict[str, Any] = {}
    try:
        import main as backend_main  # loaded by uvicorn; shares env parsing

        params = dict(backend_main.conn_params)
    except Exception:
        params = {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": int(os.getenv("DB_PORT", "5432")),
            "dbname": os.getenv("DB_NAME", "postgres"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASSWORD", ""),
            "sslmode": os.getenv("DB_SSLMODE", "prefer"),
        }
    params.setdefault("connect_timeout", 5)
    return psycopg2.connect(**params)


def _rank_tier(rating: int) -> str:
    if rating >= 2100:
        return "Master"
    if rating >= 1900:
        return "Diamond"
    if rating >= 1700:
        return "Platinum"
    if rating >= 1500:
        return "Gold"
    if rating >= 1300:
        return "Silver"
    return "Bronze"


def _elo_delta(own: int, opponent: int, score: float) -> int:
    expected = 1.0 / (1.0 + 10 ** ((opponent - own) / 400.0))
    return int(round(ELO_K_FACTOR * (score - expected)))


def ensure_schema() -> None:
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS algo_problems (
                    id VARCHAR(64) PRIMARY KEY,
                    title VARCHAR(128) NOT NULL,
                    difficulty VARCHAR(16) NOT NULL,
                    description TEXT NOT NULL,
                    constraints TEXT NOT NULL,
                    starter_code JSONB NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS algo_matches (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    room_code VARCHAR(16) UNIQUE NOT NULL,
                    problem_id VARCHAR(64) REFERENCES algo_problems(id),
                    status VARCHAR(24) DEFAULT 'WAITING',
                    winner_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                    started_at TIMESTAMP WITH TIME ZONE,
                    finished_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            )
            cur.execute(
                "ALTER TABLE algo_matches ADD COLUMN IF NOT EXISTS "
                "started_at TIMESTAMP WITH TIME ZONE"
            )
            cur.execute(
                "ALTER TABLE algo_matches ADD COLUMN IF NOT EXISTS "
                "finished_at TIMESTAMP WITH TIME ZONE"
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS algo_match_participants (
                    match_id UUID REFERENCES algo_matches(id) ON DELETE CASCADE,
                    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                    language VARCHAR(24) NOT NULL,
                    code TEXT,
                    tests_passed INTEGER DEFAULT 0,
                    total_tests INTEGER DEFAULT 0,
                    cpu_time_ms FLOAT,
                    peak_memory_kb FLOAT,
                    submitted_at TIMESTAMP WITH TIME ZONE,
                    PRIMARY KEY (match_id, user_id)
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS algo_ratings (
                    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    elo_rating INTEGER DEFAULT 1200,
                    matches_played INTEGER DEFAULT 0,
                    wins INTEGER DEFAULT 0,
                    losses INTEGER DEFAULT 0,
                    rank_tier VARCHAR(24) DEFAULT 'Bronze',
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS algo_ratings_elo_idx "
                "ON algo_ratings (elo_rating DESC)"
            )
        conn.commit()
    finally:
        conn.close()


def seed_problems(problems: list[Problem] | None = None) -> None:
    problems = problems or all_problems()
    conn = _connect()
    try:
        with conn.cursor() as cur:
            for problem in problems:
                cur.execute(
                    """
                    INSERT INTO algo_problems
                        (id, title, difficulty, description, constraints, starter_code)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        difficulty = EXCLUDED.difficulty,
                        description = EXCLUDED.description,
                        constraints = EXCLUDED.constraints,
                        starter_code = EXCLUDED.starter_code
                    """,
                    (
                        problem.id,
                        problem.title,
                        problem.difficulty,
                        problem.description,
                        problem.constraints,
                        Json(problem.starter_code),
                    ),
                )
        conn.commit()
    finally:
        conn.close()


def initialize() -> None:
    """Create tables and seed the problem bank. Never raises."""
    try:
        ensure_schema()
        seed_problems()
        print("Algo Battle: database schema ready.")
    except Exception as exc:  # pragma: no cover - environment dependent
        print(f"Warning: Algo Battle database unavailable: {exc}")


def get_rating(user_id: int) -> dict[str, Any]:
    try:
        conn = _connect()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT r.user_id, u.username, r.elo_rating, r.matches_played,
                           r.wins, r.losses, r.rank_tier,
                           (SELECT COUNT(*) FROM algo_match_participants p
                            WHERE p.user_id = r.user_id) AS submissions
                    FROM algo_ratings r
                    JOIN users u ON u.id = r.user_id
                    WHERE r.user_id = %s
                    """,
                    (user_id,),
                )
                row = cur.fetchone()
                if row:
                    return dict(row)
        finally:
            conn.close()
    except Exception as exc:  # pragma: no cover
        print(f"Warning: could not fetch Algo Battle rating: {exc}")

    return {
        "user_id": user_id,
        "elo_rating": DEFAULT_RATING,
        "matches_played": 0,
        "wins": 0,
        "losses": 0,
        "submissions": 0,
        "rank_tier": "Bronze",
    }


def leaderboard(limit: int = 10) -> list[dict[str, Any]]:
    try:
        conn = _connect()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT r.user_id, u.username, r.elo_rating, r.matches_played,
                           r.wins, r.losses, r.rank_tier
                    FROM algo_ratings r
                    JOIN users u ON u.id = r.user_id
                    ORDER BY r.elo_rating DESC, r.wins DESC
                    LIMIT %s
                    """,
                    (limit,),
                )
                return [dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
    except Exception as exc:  # pragma: no cover
        print(f"Warning: could not fetch Algo Battle leaderboard: {exc}")
        return []


def record_match(
    room_code: str,
    problem: Problem,
    result: dict[str, Any],
    started_at: Any = None,
) -> dict[str, Any]:
    """Persist a finished match and update both players' Elo ratings."""
    rating_changes: dict[int, dict[str, Any]] = {}
    winner_side = result.get("winner")
    p1 = result["p1"]
    p2 = result["p2"]

    try:
        conn = _connect()
    except Exception as exc:  # pragma: no cover
        print(f"Warning: could not persist Algo Battle match: {exc}")
        return rating_changes

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            winner_id = result.get("winner_id")
            cur.execute(
                """
                INSERT INTO algo_matches
                    (room_code, problem_id, status, winner_id, started_at, finished_at)
                VALUES (%s, %s, 'FINISHED', %s, %s, NOW())
                ON CONFLICT (room_code) DO UPDATE SET
                    status = 'FINISHED',
                    winner_id = EXCLUDED.winner_id,
                    finished_at = NOW()
                RETURNING id, created_at
                """,
                (room_code, problem.id, winner_id, started_at),
            )
            match_row = cur.fetchone()
            match_id = match_row["id"]

            ratings: dict[int, int] = {}
            for player in (p1, p2):
                user_id = player["user_id"]
                cur.execute(
                    """
                    INSERT INTO algo_ratings (user_id, elo_rating, rank_tier)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (user_id) DO NOTHING
                    """,
                    (user_id, DEFAULT_RATING, "Bronze"),
                )
                cur.execute(
                    "SELECT elo_rating FROM algo_ratings WHERE user_id = %s",
                    (user_id,),
                )
                ratings[user_id] = cur.fetchone()["elo_rating"]

            p1_score = 1.0 if winner_side == "p1" else 0.0 if winner_side == "p2" else 0.5
            p2_score = 1.0 if winner_side == "p2" else 0.0 if winner_side == "p1" else 0.5
            p1_delta = _elo_delta(ratings[p1["user_id"]], ratings[p2["user_id"]], p1_score)
            p2_delta = _elo_delta(ratings[p2["user_id"]], ratings[p1["user_id"]], p2_score)

            for player, delta in ((p1, p1_delta), (p2, p2_delta)):
                user_id = player["user_id"]
                new_rating = max(100, ratings[user_id] + delta)
                wins = 1 if (player["side"] == winner_side) else 0
                losses = 1 if winner_side != "draw" and player["side"] != winner_side else 0
                cur.execute(
                    """
                    UPDATE algo_ratings SET
                        elo_rating = %s,
                        matches_played = matches_played + 1,
                        wins = wins + %s,
                        losses = losses + %s,
                        rank_tier = %s,
                        updated_at = NOW()
                    WHERE user_id = %s
                    """,
                    (new_rating, wins, losses, _rank_tier(new_rating), user_id),
                )
                rating_changes[user_id] = {
                    "before": ratings[user_id],
                    "after": new_rating,
                    "delta": new_rating - ratings[user_id],
                    "rank_tier": _rank_tier(new_rating),
                }

            for player in (p1, p2):
                cur.execute(
                    """
                    INSERT INTO algo_match_participants
                        (match_id, user_id, language, code, tests_passed, total_tests,
                         cpu_time_ms, peak_memory_kb, submitted_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, to_timestamp(%s))
                    ON CONFLICT (match_id, user_id) DO UPDATE SET
                        language = EXCLUDED.language,
                        code = EXCLUDED.code,
                        tests_passed = EXCLUDED.tests_passed,
                        total_tests = EXCLUDED.total_tests,
                        cpu_time_ms = EXCLUDED.cpu_time_ms,
                        peak_memory_kb = EXCLUDED.peak_memory_kb,
                        submitted_at = EXCLUDED.submitted_at
                    """,
                    (
                        match_id,
                        player["user_id"],
                        player["language"],
                        player["code"],
                        player["passed_count"],
                        player["total_count"],
                        player["time_ms"],
                        player["memory_kb"],
                        player.get("submitted_at"),
                    ),
                )
        conn.commit()
    except Exception as exc:  # pragma: no cover
        conn.rollback()
        rating_changes.clear()
        print(f"Warning: could not persist Algo Battle match: {exc}")
    finally:
        conn.close()

    return rating_changes


__all__ = [
    "initialize",
    "ensure_schema",
    "seed_problems",
    "get_rating",
    "leaderboard",
    "record_match",
]
