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
                CREATE TABLE IF NOT EXISTS "algoBattleData" (
                    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    elo_rating INTEGER NOT NULL DEFAULT 1200,
                    matches_played INTEGER NOT NULL DEFAULT 0,
                    wins INTEGER NOT NULL DEFAULT 0,
                    losses INTEGER NOT NULL DEFAULT 0,
                    submissions INTEGER NOT NULL DEFAULT 0,
                    rank_tier VARCHAR(24) NOT NULL DEFAULT 'Bronze',
                    match_history JSONB NOT NULL DEFAULT '[]'::jsonb,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                'CREATE INDEX IF NOT EXISTS "algoBattleData_elo_idx" '
                'ON "algoBattleData" (elo_rating DESC)'
            )
            cur.execute(
                "SELECT EXISTS ("
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = current_schema() AND table_name = 'algo_ratings'"
                ")"
            )
            if cur.fetchone()[0]:
                cur.execute(
                    """
                    INSERT INTO "algoBattleData"
                        (user_id, elo_rating, matches_played, wins, losses,
                         rank_tier, submissions)
                    SELECT user_id, elo_rating, matches_played, wins, losses,
                           rank_tier, 0
                    FROM algo_ratings
                    ON CONFLICT (user_id) DO NOTHING
                    """
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
                           r.wins, r.losses, r.rank_tier, r.submissions
                    FROM "algoBattleData" r
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
                    FROM "algoBattleData" r
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
            ratings: dict[int, int] = {}
            for player in (p1, p2):
                user_id = player["user_id"]
                cur.execute(
                    """
                    INSERT INTO "algoBattleData" (user_id, rank_tier)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id) DO NOTHING
                    """,
                    (user_id, "Bronze"),
                )
                cur.execute(
                    'SELECT elo_rating FROM "algoBattleData" '
                    "WHERE user_id = %s FOR UPDATE",
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
                    UPDATE "algoBattleData" SET
                        elo_rating = %s,
                        matches_played = matches_played + 1,
                        wins = wins + %s,
                        losses = losses + %s,
                        rank_tier = %s,
                        submissions = submissions + 1,
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

            match_record = {
                "room_code": room_code,
                "problem_id": problem.id,
                "winner": winner_side,
                "winner_id": result.get("winner_id"),
                "started_at": started_at,
                "finished_at": result.get("evaluated_at"),
                "players": [p1, p2],
                "combat_log": result.get("combatLog", []),
            }
            for player in (p1, p2):
                cur.execute(
                    """
                    UPDATE "algoBattleData"
                    SET match_history = match_history || %s::jsonb,
                        updated_at = NOW()
                    WHERE user_id = %s
                    """,
                    (Json([match_record]), player["user_id"]),
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
