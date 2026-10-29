"""Simultaneous submission evaluation and the Algo Battle combat engine."""

from __future__ import annotations

import asyncio
import time
from typing import Any

from . import profiler
from .problems import Problem

STARTING_HP = 100
FAILED_TEST_DAMAGE = 15
MAX_TIME_DAMAGE = 50
TIME_DAMAGE_FACTOR = 20
MAX_SHIELD = 25
INITIATIVE_BONUS = 10


def _player_payload(
    side: str,
    player: dict[str, Any],
    result: dict[str, Any],
) -> dict[str, Any]:
    return {
        "side": side,
        "user_id": player.get("user_id"),
        "username": player.get("username", "Player"),
        "language": player.get("language", "python"),
        "code": player.get("code", ""),
        "submitted_at": player.get("submitted_at"),
        "all_passed": result.get("all_passed", False),
        "passed_count": result.get("passed_count", 0),
        "total_count": result.get("total_count", 0),
        "time_ms": result.get("time_ms", 0.0),
        "memory_kb": result.get("memory_kb", 0.0),
        "error": result.get("error"),
        "failures": result.get("failures", []),
        "timed_out": result.get("timed_out", False),
        "big_o": profiler.estimate_complexity(result),
        "hp": STARTING_HP,
        "max_hp": STARTING_HP,
        "damage_dealt": 0,
        "damage_taken": 0,
        "shield": 0.0,
        "shield_absorbed": 0.0,
        "forfeited": bool(player.get("forfeited")),
    }


def _faster_side(p1: dict[str, Any], p2: dict[str, Any]) -> str | None:
    if not p1["all_passed"] or not p2["all_passed"]:
        return None
    if abs(p1["time_ms"] - p2["time_ms"]) < 0.0005:
        return None
    return "p1" if p1["time_ms"] < p2["time_ms"] else "p2"


def _shield_value(player: dict[str, Any], opponent: dict[str, Any]) -> float:
    own_memory = float(player.get("memory_kb") or 0.0)
    other_memory = float(opponent.get("memory_kb") or 0.0)
    if own_memory <= 0 or other_memory <= 0 or own_memory >= other_memory:
        return 0.0
    return max(0.0, min(MAX_SHIELD, MAX_SHIELD * (1.0 - own_memory / other_memory)))


def _apply_attack(
    attacker: dict[str, Any],
    defender: dict[str, Any],
    raw_damage: float,
    log: list[dict[str, Any]],
    at: int,
    reason: str,
) -> None:
    absorbed = min(defender["shield"], raw_damage)
    damage = max(0.0, raw_damage - absorbed)
    defender["hp"] = max(0.0, defender["hp"] - damage)
    defender["damage_taken"] += damage
    defender["shield_absorbed"] += absorbed
    attacker["damage_dealt"] += damage

    if absorbed > 0:
        log.append(
            {
                "at": at,
                "type": "shield",
                "source": defender["side"],
                "target": defender["side"],
                "amount": round(absorbed, 1),
                "message": (
                    f"{defender['username']}'s memory shield absorbed "
                    f"{absorbed:.1f} damage."
                ),
            }
        )
    log.append(
        {
            "at": at + 120,
            "type": "attack",
            "source": attacker["side"],
            "target": defender["side"],
            "amount": round(damage, 1),
            "raw": round(raw_damage, 1),
            "message": (
                f"{attacker['username']} lands a {reason} strike for "
                f"{damage:.1f} damage."
            ),
        }
    )


def build_combat_result(
    problem: Problem,
    player1: dict[str, Any],
    player2: dict[str, Any],
    result1: dict[str, Any],
    result2: dict[str, Any],
) -> dict[str, Any]:
    p1 = _player_payload("p1", player1, result1)
    p2 = _player_payload("p2", player2, result2)
    combat_log: list[dict[str, Any]] = []

    # 1. Correctness is the gatekeeper: every failed test hurts its own player.
    for player in (p1, p2):
        if player["forfeited"]:
            player["hp"] = 0
            combat_log.append(
                {
                    "at": 0,
                    "type": "forfeit",
                    "source": player["side"],
                    "target": player["side"],
                    "amount": STARTING_HP,
                    "message": f"{player['username']} forfeited the duel.",
                }
            )
            continue
        failed = max(0, player["total_count"] - player["passed_count"])
        self_damage = min(STARTING_HP, failed * FAILED_TEST_DAMAGE)
        if self_damage:
            player["hp"] = max(0.0, player["hp"] - self_damage)
            player["damage_taken"] += self_damage
            combat_log.append(
                {
                    "at": 80,
                    "type": "self_damage",
                    "source": player["side"],
                    "target": player["side"],
                    "amount": self_damage,
                    "message": (
                        f"{player['username']} lost {self_damage} HP to "
                        f"{failed} failed test{'s' if failed != 1 else ''}."
                    ),
                }
            )

    # 2. Memory advantage becomes a shield.
    p1["shield"] = _shield_value(p1, p2)
    p2["shield"] = _shield_value(p2, p1)

    # 3. Only two fully correct solutions trade time-based blows.
    faster = _faster_side(p1, p2)
    if faster == "p1":
        attack = min(
            MAX_TIME_DAMAGE,
            TIME_DAMAGE_FACTOR * max(p2["time_ms"], 0.001) / max(p1["time_ms"], 0.001),
        )
        if (p1["submitted_at"] or 0) < (p2["submitted_at"] or 0):
            attack += INITIATIVE_BONUS
            combat_log.append(
                {
                    "at": 300,
                    "type": "initiative",
                    "source": "p1",
                    "target": "p2",
                    "amount": INITIATIVE_BONUS,
                    "message": f"{p1['username']} strikes first for +{INITIATIVE_BONUS} initiative.",
                }
            )
        _apply_attack(p1, p2, attack, combat_log, 420, "time")
    elif faster == "p2":
        attack = min(
            MAX_TIME_DAMAGE,
            TIME_DAMAGE_FACTOR * max(p1["time_ms"], 0.001) / max(p2["time_ms"], 0.001),
        )
        if (p2["submitted_at"] or 0) < (p1["submitted_at"] or 0):
            attack += INITIATIVE_BONUS
            combat_log.append(
                {
                    "at": 300,
                    "type": "initiative",
                    "source": "p2",
                    "target": "p1",
                    "amount": INITIATIVE_BONUS,
                    "message": f"{p2['username']} strikes first for +{INITIATIVE_BONUS} initiative.",
                }
            )
        _apply_attack(p2, p1, attack, combat_log, 420, "time")
    elif p1["all_passed"] and p2["all_passed"] and not p1["forfeited"] and not p2["forfeited"]:
        _apply_attack(p1, p2, TIME_DAMAGE_FACTOR, combat_log, 420, "simultaneous")
        _apply_attack(p2, p1, TIME_DAMAGE_FACTOR, combat_log, 620, "simultaneous")

    # 4. Decide the winner.
    winner_side = "draw"
    if p1["forfeited"] and not p2["forfeited"]:
        winner_side = "p2"
    elif p2["forfeited"] and not p1["forfeited"]:
        winner_side = "p1"
    elif p1["hp"] > p2["hp"]:
        winner_side = "p1"
    elif p2["hp"] > p1["hp"]:
        winner_side = "p2"
    elif p1["all_passed"] != p2["all_passed"]:
        winner_side = "p1" if p1["all_passed"] else "p2"
    elif p1["passed_count"] != p2["passed_count"]:
        winner_side = "p1" if p1["passed_count"] > p2["passed_count"] else "p2"
    elif p1["time_ms"] != p2["time_ms"]:
        winner_side = "p1" if p1["time_ms"] < p2["time_ms"] else "p2"
    elif (p1["submitted_at"] or float("inf")) != (p2["submitted_at"] or float("inf")):
        winner_side = (
            "p1"
            if (p1["submitted_at"] or float("inf"))
            < (p2["submitted_at"] or float("inf"))
            else "p2"
        )

    if winner_side == "draw":
        combat_log.append(
            {
                "at": 1_500,
                "type": "finish",
                "source": "draw",
                "target": "draw",
                "amount": 0,
                "message": "Both fighters are still standing. The duel is a draw.",
            }
        )
    else:
        winner = p1 if winner_side == "p1" else p2
        loser = p2 if winner_side == "p1" else p1
        combat_log.append(
            {
                "at": 1_500,
                "type": "finish",
                "source": winner_side,
                "target": loser["side"],
                "amount": round(loser["hp"], 1),
                "message": f"{winner['username']} wins the duel!",
            }
        )

    for player in (p1, p2):
        player["hp"] = round(player["hp"], 1)
        player["shield"] = round(player["shield"], 1)
        player["shield_absorbed"] = round(player["shield_absorbed"], 1)
        player["damage_dealt"] = round(player["damage_dealt"], 1)
        player["damage_taken"] = round(player["damage_taken"], 1)

    return {
        "winner": winner_side,
        "winner_id": (
            p1["user_id"]
            if winner_side == "p1"
            else p2["user_id"]
            if winner_side == "p2"
            else None
        ),
        "problem_id": problem.id,
        "problem_title": problem.title,
        "problem": problem.public_dict(),
        "p1": p1,
        "p2": p2,
        "combatLog": combat_log,
        "evaluated_at": time.time(),
    }


async def evaluate_battle(
    problem: Problem,
    player1: dict[str, Any],
    player2: dict[str, Any],
) -> dict[str, Any]:
    """Benchmark both submissions in parallel and return the combat result."""
    result1, result2 = await asyncio.gather(
        profiler.run_submission(
            player1.get("code") or "",
            player1.get("language") or "python",
            problem,
            include_stress=True,
        ),
        profiler.run_submission(
            player2.get("code") or "",
            player2.get("language") or "python",
            problem,
            include_stress=True,
        ),
    )
    return build_combat_result(problem, player1, player2, result1, result2)


__all__ = ["evaluate_battle", "build_combat_result"]
