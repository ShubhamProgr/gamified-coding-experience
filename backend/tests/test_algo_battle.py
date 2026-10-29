"""Unit tests for the Algo Battle profiler and combat engine."""

from __future__ import annotations

import asyncio
import dataclasses
import unittest

import algo_battle.room_manager as room_manager_module
from algo_battle.evaluator import build_combat_result
from algo_battle.problems import TestCase, get_problem
from algo_battle.profiler import estimate_complexity, run_submission_sync
from algo_battle.room_manager import RoomManager

FAST_TWO_SUM = """
class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for index, value in enumerate(nums):
            complement = target - value
            if complement in seen:
                return [seen[complement], index]
            seen[value] = index
        return []
"""

SLOW_TWO_SUM = """
class Solution:
    def twoSum(self, nums, target):
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j]
        return []
"""


def _scaled_problem(size: int):
    problem = get_problem("two-sum")
    assert problem is not None
    nums = list(range(0, size * 2, 2))
    stress = [
        TestCase(
            args=[nums, nums[-1] + nums[-2]],
            expected=f"{size - 2},{size - 1}",
            label="scaled",
        )
    ]
    return dataclasses.replace(problem, stress_tests=stress)


def _profile(
    *,
    passed: int,
    total: int,
    time_ms: float,
    memory_kb: float,
    language: str = "python",
) -> dict:
    return {
        "all_passed": passed == total,
        "passed_count": passed,
        "total_count": total,
        "time_ms": time_ms,
        "memory_kb": memory_kb,
        "error": None,
        "failures": [],
        "timed_out": False,
        "largest_ms": time_ms,
        "largest_n": 100_000,
        "language": language,
    }


class ProfilerTests(unittest.TestCase):
    def test_correct_python_solution_passes_samples(self) -> None:
        problem = get_problem("two-sum")
        assert problem is not None
        result = run_submission_sync(
            FAST_TWO_SUM, "python", problem, include_stress=False
        )
        self.assertTrue(result["all_passed"])
        self.assertEqual(result["passed_count"], result["total_count"])

    def test_quadratic_solution_scores_worse_than_linear(self) -> None:
        problem = _scaled_problem(2_500)
        fast = run_submission_sync(FAST_TWO_SUM, "python", problem)
        slow = run_submission_sync(SLOW_TWO_SUM, "python", problem)

        self.assertTrue(fast["all_passed"])
        self.assertTrue(slow["all_passed"])
        self.assertGreater(slow["time_ms"], fast["time_ms"] * 8)

    def test_complexity_estimate_recognises_linear_solution(self) -> None:
        result = _profile(passed=7, total=7, time_ms=20, memory_kb=100)
        self.assertEqual(estimate_complexity(result), "O(N)")


class CombatTests(unittest.TestCase):
    def _players(self):
        return (
            {
                "user_id": 1,
                "username": "alice",
                "code": "a",
                "language": "python",
                "submitted_at": 10,
            },
            {
                "user_id": 2,
                "username": "bob",
                "code": "b",
                "language": "python",
                "submitted_at": 20,
            },
        )

    def test_faster_correct_solution_wins(self) -> None:
        problem = get_problem("two-sum")
        assert problem is not None
        p1, p2 = self._players()
        result = build_combat_result(
            problem,
            p1,
            p2,
            _profile(passed=7, total=7, time_ms=12, memory_kb=500),
            _profile(passed=7, total=7, time_ms=90, memory_kb=900),
        )
        self.assertEqual(result["winner"], "p1")
        self.assertLess(result["p2"]["hp"], result["p2"]["max_hp"])

    def test_failed_tests_damage_the_submitter(self) -> None:
        problem = get_problem("two-sum")
        assert problem is not None
        p1, p2 = self._players()
        result = build_combat_result(
            problem,
            p1,
            p2,
            _profile(passed=5, total=7, time_ms=20, memory_kb=500),
            _profile(passed=2, total=7, time_ms=400, memory_kb=900),
        )
        self.assertLess(result["p1"]["hp"], result["p1"]["max_hp"])
        self.assertLess(result["p2"]["hp"], result["p2"]["max_hp"])
        self.assertEqual(result["winner"], "p1")


class FakeSocket:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send_json(self, payload: dict) -> None:
        self.sent.append(payload)


class RoomManagerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.manager = RoomManager()
        self.original_countdown = room_manager_module.COUNTDOWN_SECONDS

    async def asyncTearDown(self) -> None:
        room_manager_module.COUNTDOWN_SECONDS = self.original_countdown
        for room in list(self.manager.rooms.values()):
            for task in list(room.tasks):
                task.cancel()
        await asyncio.sleep(0)

    async def test_quick_match_pairs_two_players_in_one_room(self) -> None:
        first = await self.manager.quick_match(1, "alice")
        second = await self.manager.quick_match(2, "bob")
        self.assertIs(first, second)
        self.assertEqual(first.mode, "quick")

    async def test_both_ready_starts_the_match(self) -> None:
        room_manager_module.COUNTDOWN_SECONDS = 0
        room = await self.manager.create_room(problem_id="two-sum")
        alice = {"id": 1, "username": "alice"}
        bob = {"id": 2, "username": "bob"}
        _, player1 = await self.manager.join(room.code, alice, FakeSocket())
        _, player2 = await self.manager.join(room.code, bob, FakeSocket())

        await self.manager.set_ready(room, player1, True)
        await self.manager.set_ready(room, player2, True)
        await asyncio.sleep(0.05)

        self.assertEqual(room.status, "CODING")
        self.assertIsNotNone(room.problem)
        self.assertIsNotNone(room.started_at)

    async def test_disconnect_during_countdown_reopens_the_slot(self) -> None:
        room_manager_module.COUNTDOWN_SECONDS = 5
        room = await self.manager.create_room(problem_id="two-sum")
        alice = {"id": 1, "username": "alice"}
        bob = {"id": 2, "username": "bob"}
        alice_socket = FakeSocket()
        bob_socket = FakeSocket()
        _, player1 = await self.manager.join(room.code, alice, alice_socket)
        await self.manager.join(room.code, bob, bob_socket)

        await self.manager.set_ready(room, player1, True)
        bob_player = room.players[2]
        await self.manager.set_ready(room, bob_player, True)
        await asyncio.sleep(0.02)
        self.assertEqual(room.status, "COUNTDOWN")

        await self.manager.disconnect(room.code, 1, alice_socket)

        self.assertEqual(room.status, "WAITING")
        self.assertNotIn(1, room.players)
        self.assertFalse(bob_player.ready)


if __name__ == "__main__":
    unittest.main()
