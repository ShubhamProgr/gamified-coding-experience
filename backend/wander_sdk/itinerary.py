"""Linked-list nodes which emit a serializable pointer timeline."""

from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any

_events: ContextVar[list[dict[str, Any]] | None] = ContextVar("wander_events", default=None)


@dataclass(frozen=True)
class TraceEvent:
    action: str
    type: str | None = None
    source: str | None = None
    target: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {key: value for key, value in {
            "action": self.action,
            "type": self.type,
            "from": self.source,
            "target": self.target,
        }.items() if value is not None}


def _node_id(node: "Node | None") -> str | None:
    return node.node_id if node is not None else None


def emit(event: dict[str, Any]) -> None:
    events = _events.get()
    if events is not None:
        events.append(event)


def clear_trace() -> None:
    _events.set([])


def get_trace() -> list[dict[str, Any]]:
    return list(_events.get() or [])


class Node:
    """A user-facing itinerary node with traced ``next`` and ``prev`` links."""

    def __init__(
        self,
        name: str,
        category: str = "landmark",
        lat: float = 0.0,
        lng: float = 0.0,
        data: dict[str, Any] | None = None,
        node_id: str | None = None,
    ) -> None:
        self.name = name
        self.category = category
        self.lat = lat
        self.lng = lng
        self.data = data or {}
        self.node_id = node_id or f"node_{id(self)}"
        self._next: Node | None = None
        self._prev: Node | None = None

    @property
    def next(self) -> "Node | None":
        emit({"action": "POINTER_READ", "type": "next", "from": self.node_id, "target": _node_id(self._next)})
        return self._next

    @next.setter
    def next(self, target: "Node | None") -> None:
        if target is not None and not isinstance(target, Node):
            raise TypeError("next must reference a Node or None")
        emit({"action": "POINTER_WRITE", "type": "next", "from": self.node_id, "new_target": _node_id(target)})
        self._next = target

    @property
    def prev(self) -> "Node | None":
        emit({"action": "POINTER_READ", "type": "prev", "from": self.node_id, "target": _node_id(self._prev)})
        return self._prev

    @prev.setter
    def prev(self, target: "Node | None") -> None:
        if target is not None and not isinstance(target, Node):
            raise TypeError("prev must reference a Node or None")
        emit({"action": "POINTER_WRITE", "type": "prev", "from": self.node_id, "new_target": _node_id(target)})
        self._prev = target

    def snapshot(self) -> dict[str, Any]:
        return {"id": self.node_id, "name": self.name, "category": self.category}
