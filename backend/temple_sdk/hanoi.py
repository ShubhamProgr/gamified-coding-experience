"""Temple SDK: Peg and Disk objects that record every MOVE_DISK event."""

from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any

MAX_MOVES = 500

_events: ContextVar[list[dict[str, Any]] | None] = ContextVar("temple_events", default=None)
_move_count: ContextVar[int] = ContextVar("temple_moves", default=0)


class TooManyMovesError(RuntimeError):
    """Raised when a submission exceeds the disk move limit."""


def clear_trace() -> None:
    _events.set([])
    _move_count.set(0)


def get_trace() -> list[dict[str, Any]]:
    return list(_events.get() or [])


def get_move_count() -> int:
    return _move_count.get()


def _emit(event: dict[str, Any]) -> None:
    events = _events.get()
    if events is not None:
        events.append(event)


@dataclass
class Disk:
    size: int
    peg_id: str

    def __repr__(self) -> str:
        return f"Disk(size={self.size})"


class Peg:
    def __init__(self, peg_id: str, disks: list[Disk] | None = None) -> None:
        self.peg_id = peg_id
        self._stack: list[Disk] = disks or []

    def __repr__(self) -> str:
        return f"Peg({self.peg_id}, disks={self._stack})"

    def peek(self) -> Disk | None:
        return self._stack[-1] if self._stack else None

    def push(self, disk: Disk) -> None:
        top = self.peek()
        if top is not None and top.size < disk.size:
            raise ValueError(
                f"Cannot place Disk(size={disk.size}) on Disk(size={top.size}). "
                "Larger discs cannot sit on smaller ones - the temple collapses!"
            )
        if _move_count.get() >= MAX_MOVES:
            raise TooManyMovesError(
                "Too many disk moves. The temple trembles! Check your base case."
            )
        _move_count.set(_move_count.get() + 1)
        _emit(
            {
                "action": "MOVE_DISK",
                "disk_size": disk.size,
                "from_peg": disk.peg_id,
                "to_peg": self.peg_id,
                "move_number": _move_count.get(),
            }
        )
        self._stack.append(disk)
        disk.peg_id = self.peg_id

    def pop(self) -> Disk:
        if not self._stack:
            raise ValueError(
                f"Peg {self.peg_id} is empty. Cannot move a disc from an empty spire."
            )
        return self._stack.pop()


def move(disk_count: int, source: Peg, auxiliary: Peg, target: Peg) -> None:
    if disk_count == 0:
        return
    move(disk_count - 1, source, target, auxiliary)
    target.push(source.pop())
    move(disk_count - 1, auxiliary, source, target)


def build_pegs(n: int, peg_count: int = 3) -> dict[str, Peg]:
    source = Peg("A", [Disk(size=i, peg_id="A") for i in range(n, 0, -1)])
    pegs = {"A": source, "B": Peg("B"), "C": Peg("C")}
    if peg_count == 4:
        pegs["D"] = Peg("D")
    return pegs


def snapshot_pegs(pegs: dict[str, Peg]) -> dict[str, list[int]]:
    return {pid: [d.size for d in peg._stack] for pid, peg in pegs.items()}
