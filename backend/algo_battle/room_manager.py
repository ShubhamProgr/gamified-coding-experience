"""In-memory battle rooms, matchmaking queue and WebSocket broadcasting."""

from __future__ import annotations

import asyncio
import random
import secrets
import string
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from . import db, evaluator, profiler
from .problems import Problem, get_problem, pick_problem

ROOM_CODE_ALPHABET = string.ascii_uppercase + string.digits
MATCH_DURATION_SECONDS = 10 * 60
COUNTDOWN_SECONDS = 5
ROOM_TTL_SECONDS = 30 * 60


def _now() -> float:
    return time.time()


@dataclass
class BattlePlayer:
    user_id: int
    username: str
    websocket: Any | None = None
    ready: bool = False
    submitted: bool = False
    connected: bool = True
    testing: bool = False
    forfeited: bool = False
    code: str = ""
    language: str = "python"
    submitted_at: float | None = None
    tests_passed: int = 0
    total_tests: int = 0

    def public(self) -> dict[str, Any]:
        if self.submitted:
            status = "submitted"
        elif self.testing:
            status = "testing"
        elif self.tests_passed:
            status = "passed_tests"
        else:
            status = "coding"
        return {
            "user_id": self.user_id,
            "username": self.username,
            "ready": self.ready,
            "submitted": self.submitted,
            "connected": self.connected,
            "status": status,
            "passed_tests": self.tests_passed,
            "total_tests": self.total_tests,
            "forfeited": self.forfeited,
        }

    def submission(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "code": self.code,
            "language": self.language,
            "submitted_at": self.submitted_at,
            "forfeited": self.forfeited,
        }


@dataclass
class BattleRoom:
    code: str
    mode: str = "duel"
    problem: Problem | None = None
    status: str = "WAITING"
    players: dict[int, BattlePlayer] = field(default_factory=dict)
    player_order: list[int] = field(default_factory=list)
    created_at: float = field(default_factory=_now)
    started_at: float | None = None
    duration_seconds: int = MATCH_DURATION_SECONDS
    result: dict[str, Any] | None = None
    evaluating: bool = False
    tasks: set[asyncio.Task] = field(default_factory=set)

    def add_player(self, user_id: int, username: str, websocket: Any) -> BattlePlayer:
        existing = self.players.get(user_id)
        if existing:
            existing.websocket = websocket
            existing.connected = True
            existing.username = username
            return existing
        player = BattlePlayer(user_id=user_id, username=username, websocket=websocket)
        self.players[user_id] = player
        self.player_order.append(user_id)
        return player

    def ordered_players(self) -> list[BattlePlayer]:
        return [self.players[uid] for uid in self.player_order if uid in self.players]

    def opponent_of(self, user_id: int) -> BattlePlayer | None:
        for player in self.ordered_players():
            if player.user_id != user_id:
                return player
        return None

    def remaining_seconds(self) -> int:
        if not self.started_at or self.status not in {"CODING", "EVALUATION"}:
            return self.duration_seconds
        return max(0, int(self.duration_seconds - (_now() - self.started_at)))

    def public_state(self) -> dict[str, Any]:
        return {
            "roomCode": self.code,
            "mode": self.mode,
            "status": self.status,
            "players": [player.public() for player in self.ordered_players()],
            "problem": self.problem.public_dict() if self.problem else None,
            "startedAt": self.started_at,
            "durationSeconds": self.duration_seconds,
            "remainingSeconds": self.remaining_seconds(),
            "result": self.result,
        }


class RoomManager:
    def __init__(self) -> None:
        self.rooms: dict[str, BattleRoom] = {}
        self._lock = asyncio.Lock()

    # ── Room lifecycle ────────────────────────────────────────────────────

    def _generate_code(self) -> str:
        while True:
            code = "".join(secrets.choice(ROOM_CODE_ALPHABET) for _ in range(6))
            if code not in self.rooms:
                return code

    async def create_room(
        self,
        mode: str = "duel",
        problem_id: str | None = None,
    ) -> BattleRoom:
        async with self._lock:
            room = BattleRoom(
                code=self._generate_code(),
                mode=mode,
                problem=get_problem(problem_id) if problem_id else None,
            )
            self.rooms[room.code] = room
            self._spawn(room, self._cleanup_room(room.code))
            return room

    def get_room(self, code: str) -> BattleRoom | None:
        return self.rooms.get(code.upper())

    async def quick_match(
        self,
        user_id: int,
        username: str,
    ) -> BattleRoom:
        """Join a waiting quick-play room if available, otherwise create one."""
        async with self._lock:
            for room in self.rooms.values():
                if (
                    room.mode == "quick"
                    and room.status == "WAITING"
                    and len(room.ordered_players()) < 2
                    and all(player.connected for player in room.ordered_players())
                ):
                    return room
            room = BattleRoom(code=self._generate_code(), mode="quick")
            self.rooms[room.code] = room
            self._spawn(room, self._cleanup_room(room.code))
            return room

    async def join(
        self,
        code: str,
        user: dict[str, Any],
        websocket: Any,
    ) -> tuple[BattleRoom, BattlePlayer]:
        room = self.get_room(code)
        if room is None:
            raise ValueError("Room not found")
        user_id = int(user["id"])
        leaderboard = {player.user_id for player in room.ordered_players()}

        if user_id not in leaderboard and len(leaderboard) >= 2:
            raise ValueError("Room is full")
        if room.status == "FINISHED" and user_id not in leaderboard:
            raise ValueError("This duel has already finished")

        player = room.add_player(user_id, str(user["username"]), websocket)
        await self.broadcast_state(room)
        return room, player

    async def disconnect(self, code: str, user_id: int, websocket: Any) -> None:
        room = self.get_room(code)
        if room is None:
            return
        player = room.players.get(user_id)
        if player is None or player.websocket is not websocket:
            return
        player.websocket = None
        player.connected = False

        if room.status in {"WAITING", "COUNTDOWN"}:
            room.players.pop(user_id, None)
            if user_id in room.player_order:
                room.player_order.remove(user_id)
            if room.status == "COUNTDOWN":
                room.status = "WAITING"
                for remaining in room.ordered_players():
                    remaining.ready = False
            if not room.players:
                self.rooms.pop(code, None)
                return
        await self.broadcast_state(room)

    # ── Messaging ─────────────────────────────────────────────────────────

    async def send(self, player: BattlePlayer, payload: dict[str, Any]) -> None:
        if player.websocket is None:
            return
        try:
            await player.websocket.send_json(payload)
        except Exception:
            player.websocket = None
            player.connected = False

    async def broadcast(
        self,
        room: BattleRoom,
        payload: dict[str, Any],
        *,
        exclude: int | None = None,
    ) -> None:
        for player in room.ordered_players():
            if player.user_id == exclude:
                continue
            await self.send(player, payload)

    async def broadcast_state(self, room: BattleRoom) -> None:
        await self.broadcast(
            room, {"type": "ROOM_STATE", **room.public_state()}
        )

    def _spawn(self, room: BattleRoom, coroutine) -> asyncio.Task:
        task = asyncio.create_task(coroutine)
        room.tasks.add(task)
        task.add_done_callback(room.tasks.discard)
        return task

    # ── Client message router ─────────────────────────────────────────────

    async def handle_message(
        self,
        room: BattleRoom,
        player: BattlePlayer,
        message: dict[str, Any],
    ) -> None:
        kind = message.get("type")
        try:
            if kind == "PING":
                await self.send(player, {"type": "PONG", "at": _now()})
            elif kind == "PLAYER_READY":
                await self.set_ready(room, player, bool(message.get("ready", True)))
            elif kind == "RUN_TESTS":
                await self.run_tests(
                    room,
                    player,
                    str(message.get("code", "")),
                    str(message.get("language", "python")),
                )
            elif kind == "SUBMIT_SOLUTION":
                await self.submit(
                    room,
                    player,
                    str(message.get("code", "")),
                    str(message.get("language", "python")),
                )
            elif kind == "FORFEIT":
                await self.forfeit(room, player)
        except Exception as exc:
            await self.send(
                player, {"type": "ERROR", "message": f"Unable to process {kind}: {exc}"}
            )

    async def set_ready(
        self, room: BattleRoom, player: BattlePlayer, ready: bool
    ) -> None:
        if room.status not in {"WAITING", "COUNTDOWN"}:
            return
        player.ready = ready
        await self.broadcast_state(room)

        if (
            room.status == "WAITING"
            and len(room.ordered_players()) == 2
            and all(p.ready and p.connected for p in room.ordered_players())
        ):
            self._spawn(room, self._countdown(room))

    async def _countdown(self, room: BattleRoom) -> None:
        if room.status != "WAITING":
            return
        room.status = "COUNTDOWN"
        if room.problem is None:
            room.problem = pick_problem()
        await self.broadcast_state(room)

        for seconds in range(COUNTDOWN_SECONDS, 0, -1):
            if room.status != "COUNTDOWN":
                return
            await self.broadcast(
                room, {"type": "COUNTDOWN", "seconds": seconds}
            )
            await asyncio.sleep(1)

        if room.status != "COUNTDOWN":
            return
        await self._start_match(room)

    async def _start_match(self, room: BattleRoom) -> None:
        room.status = "CODING"
        room.started_at = _now()
        if room.problem is None:
            room.problem = pick_problem()
        for player in room.ordered_players():
            player.ready = True

        await self.broadcast(
            room,
            {
                "type": "MATCH_START",
                "problem": room.problem.public_dict(),
                "durationSeconds": room.duration_seconds,
                "startedAt": room.started_at,
                "serverNow": _now(),
            },
        )
        await self.broadcast_state(room)
        self._spawn(room, self._match_timeout(room))

    async def _match_timeout(self, room: BattleRoom) -> None:
        await asyncio.sleep(room.duration_seconds + 1)
        if room.status != "CODING":
            return
        for player in room.ordered_players():
            if not player.submitted and not player.forfeited:
                player.submitted = True
                player.submitted_at = _now()
        await self._begin_evaluation(room, reason="timeout")

    async def run_tests(
        self,
        room: BattleRoom,
        player: BattlePlayer,
        code: str,
        language: str,
    ) -> None:
        if room.status != "CODING" or room.problem is None:
            await self.send(
                player,
                {"type": "ERROR", "message": "The coding phase is not active."},
            )
            return
        if player.testing:
            return
        if language not in {"python", "cpp", "java"}:
            language = "python"

        player.code = code
        player.language = language
        player.testing = True
        opponent = room.opponent_of(player.user_id)
        if opponent is not None:
            await self.send(
                opponent,
                {
                    "type": "OPPONENT_UPDATE",
                    "user_id": player.user_id,
                    "status": "testing",
                    "passed_count": player.tests_passed,
                    "total_count": player.total_tests,
                },
            )

        result = await profiler.run_submission(
            code, language, room.problem, include_stress=False
        )
        player.testing = False
        player.tests_passed = int(result.get("passed_count", 0))
        player.total_tests = int(result.get("total_count", 0))

        await self.send(
            player,
            {
                "type": "TEST_RESULTS",
                "user_id": player.user_id,
                "language": language,
                "sample": True,
                "result": result,
            },
        )
        await self.broadcast(
            room,
            {
                "type": "OPPONENT_UPDATE",
                "user_id": player.user_id,
                "status": (
                    "passed_tests" if player.tests_passed else "coding"
                ),
                "passed_count": player.tests_passed,
                "total_count": player.total_tests,
            },
            exclude=player.user_id,
        )
        await self.broadcast_state(room)

    async def submit(
        self,
        room: BattleRoom,
        player: BattlePlayer,
        code: str,
        language: str,
    ) -> None:
        if room.status != "CODING":
            await self.send(
                player,
                {"type": "ERROR", "message": "Submissions are closed."},
            )
            return
        if player.submitted:
            return
        if language not in {"python", "cpp", "java"}:
            language = "python"

        player.code = code
        player.language = language
        player.submitted = True
        player.submitted_at = _now()

        await self.broadcast(
            room,
            {
                "type": "OPPONENT_UPDATE",
                "user_id": player.user_id,
                "status": "submitted",
                "passed_count": player.tests_passed,
                "total_count": player.total_tests,
            },
        )
        await self.broadcast_state(room)

        if all(
            p.submitted or p.forfeited for p in room.ordered_players()
        ) and len(room.ordered_players()) == 2:
            await self._begin_evaluation(room, reason="both_submitted")

    async def forfeit(self, room: BattleRoom, player: BattlePlayer) -> None:
        if room.status in {"FINISHED", "EVALUATION"}:
            return
        player.forfeited = True
        player.submitted = True
        player.submitted_at = _now()

        if room.status == "CODING":
            opponent = room.opponent_of(player.user_id)
            if opponent is not None and not opponent.submitted:
                opponent.submitted = True
                opponent.submitted_at = _now()
            await self._begin_evaluation(room, reason="forfeit")
        else:
            room.status = "FINISHED"
            await self.broadcast_state(room)

    async def _begin_evaluation(self, room: BattleRoom, reason: str) -> None:
        if room.evaluating or room.status == "FINISHED":
            return
        room.evaluating = True
        room.status = "EVALUATION"
        if room.problem is None:
            room.problem = pick_problem()

        current_task = asyncio.current_task()
        for task in list(room.tasks):
            if task is not current_task and not task.done():
                task.cancel()
        room.tasks.clear()

        await self.broadcast_state(room)
        await self.broadcast(
            room,
            {
                "type": "EVALUATION_START",
                "reason": reason,
                "message": "Benchmarking both solutions in the sandbox…",
            },
        )

        players = room.ordered_players()
        if len(players) < 2:
            room.evaluating = False
            await self.broadcast(
                room,
                {
                    "type": "ERROR",
                    "message": "A duel needs two players before it can be evaluated.",
                },
            )
            return

        player1, player2 = players[0], players[1]
        try:
            result = await evaluator.evaluate_battle(
                room.problem,
                player1.submission(),
                player2.submission(),
            )

            started_at = (
                datetime.fromtimestamp(room.started_at, tz=timezone.utc)
                if room.started_at
                else None
            )
            rating_changes = await asyncio.to_thread(
                db.record_match,
                room.code,
                room.problem,
                result,
                started_at,
            )
            if rating_changes:
                result["ratings"] = {
                    str(user_id): change
                    for user_id, change in rating_changes.items()
                }

            room.result = result
            room.status = "FINISHED"
            await self.broadcast(room, {"type": "MATCH_RESULT", "result": result})
        except Exception as exc:  # pragma: no cover - defensive
            room.status = "FINISHED"
            await self.broadcast(
                room,
                {
                    "type": "ERROR",
                    "message": f"Evaluation failed: {exc}",
                },
            )
        finally:
            room.evaluating = False
            await self.broadcast_state(room)
            self._spawn(room, self._cleanup_room(room.code))

    async def _cleanup_room(self, code: str) -> None:
        await asyncio.sleep(ROOM_TTL_SECONDS)
        room = self.rooms.get(code)
        if room is not None and room.status not in {"CODING", "EVALUATION"}:
            self.rooms.pop(code, None)


room_manager = RoomManager()


async def handle_join(
    room_manager: RoomManager,
    code: str,
    user: dict[str, Any],
    websocket: Any,
) -> tuple[BattleRoom, BattlePlayer]:
    async with room_manager._lock:
        return await room_manager.join(code, user, websocket)


__all__ = ["BattlePlayer", "BattleRoom", "RoomManager", "room_manager"]
