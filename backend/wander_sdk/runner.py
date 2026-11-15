"""Execution and scoring for linked-list submissions."""

from __future__ import annotations

import builtins
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from contextlib import redirect_stdout
from dataclasses import dataclass
from typing import Any

from .itinerary import (
    Node,
    clear_trace,
    dynamic_node_count,
    get_trace,
    reset_node_counter,
    visit,
)
from .validator import MAX_POINTER_OPS, ValidationError, validate_code


class InfiniteLoopError(RuntimeError):
    """Raised when a submission repeatedly visits the same node."""


@dataclass
class RunResult:
    success: bool
    stars_earned: int
    star_details: dict[str, bool]
    metrics: dict[str, int]
    timeline: list[dict[str, Any]]
    stdout: str
    error: str | None

    def as_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


# ── Level definitions ──────────────────────────────────────────────────────
# These sets mirror the frontend level ladder:
#   * Level 8 starts as a normal chain and the player makes it circular.
#   * Levels 9-11 already contain a cycle.
#   * Level 12 starts with no prev links; the player wires them up.
#   * Levels 13-16 start as a fully linked doubly linked list.
CIRCULAR_LEVELS = {9, 10, 11}
DOUBLY_LEVELS = {13, 14, 15, 16}
LEVELS_WITH_NEW_NODE = {4, 6}

SEED_NODES = (
    ("Grand Hotel", "hotel", 48.86, 2.34),
    ("Café de Flore", "cafe", 48.86, 2.35),
    ("City Museum", "museum", 48.87, 2.34),
    ("Clock Tower", "monument", 48.86, 2.33),
)


@dataclass
class _NodeView:
    node_id: str
    name: str
    category: str
    next_id: str | None = None
    prev_id: str | None = None


# ── Chain helpers ──────────────────────────────────────────────────────────


def _build_chain(circular: bool = False, doubly: bool = False) -> tuple[Node, list[Node]]:
    nodes = [
        Node(name, category, lat, lng, node_id=f"node_{index}")
        for index, (name, category, lat, lng) in enumerate(SEED_NODES, start=1)
    ]
    for left, right in zip(nodes, nodes[1:]):
        left.next = right
        if doubly:
            right.prev = left
    if circular:
        nodes[-1].next = nodes[0]
        if doubly:
            nodes[0].prev = nodes[-1]
    # Nodes created by the player's submission start after the seeded ones.
    reset_node_counter(len(nodes) + 1)
    return nodes[0], nodes


def _find_function(namespace: dict[str, Any]) -> Any:
    for name in ("solve", "solution", "reverse_itinerary", "main"):
        candidate = namespace.get(name)
        if callable(candidate):
            return candidate
    raise ValidationError("Define a function named solve(head) in your submission.")


def _safe_builtins() -> dict[str, Any]:
    allowed = (
        "abs", "all", "any", "enumerate", "len", "max", "min", "range",
        "reversed", "set", "sorted", "sum", "tuple", "zip", "print",
        "isinstance", "int", "str", "bool", "float", "list", "dict",
        "repr", "type", "round", "map", "filter",
        "ValueError", "TypeError", "Exception", "RuntimeError", "AssertionError",
    )
    return {name: getattr(builtins, name) for name in allowed}


# ── Timeline reconstruction ────────────────────────────────────────────────


def _target_id(value: Any) -> str | None:
    if value is None or value == "None":
        return None
    return value if isinstance(value, str) else None


def _views_from_timeline(
    initial_event: dict[str, Any], timeline: list[dict[str, Any]]
) -> dict[str, _NodeView]:
    """Replay trace events into a final graph so the scored result matches the code."""
    views: dict[str, _NodeView] = {}
    for snapshot in initial_event.get("nodes", []):
        node_id = snapshot.get("id")
        if isinstance(node_id, str):
            views[node_id] = _NodeView(
                node_id,
                str(snapshot.get("name", node_id)),
                str(snapshot.get("category", "landmark")),
                next_id=_target_id(snapshot.get("next")),
                prev_id=_target_id(snapshot.get("prev")),
            )

    for event in timeline:
        action = event.get("action")
        if action == "NODE_CREATED":
            snapshot = event.get("node") or {}
            node_id = snapshot.get("id")
            if isinstance(node_id, str):
                view = views.get(node_id)
                if view is None:
                    view = _NodeView(
                        node_id,
                        str(snapshot.get("name", node_id)),
                        str(snapshot.get("category", "landmark")),
                    )
                    views[node_id] = view
                view.name = str(snapshot.get("name", view.name))
                view.category = str(snapshot.get("category", view.category))
        elif action == "POINTER_WRITE":
            from_id = event.get("from")
            target_id = _target_id(event.get("new_target"))
            view = views.get(from_id) if isinstance(from_id, str) else None
            if view is None:
                continue
            if target_id is not None and target_id not in views:
                views[target_id] = _NodeView(target_id, target_id, "landmark")
            if event.get("type") == "next":
                view.next_id = target_id
            elif event.get("type") == "prev":
                view.prev_id = target_id
    return views


def _walk_views(
    start_id: str | None, views: dict[str, _NodeView], limit: int = 256
) -> tuple[list[_NodeView], bool]:
    order: list[_NodeView] = []
    seen: set[str] = set()
    current = start_id
    while current is not None:
        if current in seen:
            return order, True
        view = views.get(current)
        if view is None:
            break
        seen.add(current)
        order.append(view)
        if len(order) >= limit:
            break
        current = view.next_id
    return order, False


def _infer_start(views: dict[str, _NodeView], seed_ids: list[str]) -> str | None:
    incoming = {
        view.next_id
        for view in views.values()
        if view.next_id in views
    }
    for node_id in seed_ids:
        if node_id in views and node_id not in incoming:
            return node_id
    for node_id in views:
        if node_id not in incoming:
            return node_id
    return seed_ids[0] if seed_ids and seed_ids[0] in views else next(iter(views), None)


# ── Objective scoring ──────────────────────────────────────────────────────


def _stdout_has_count(stdout: str, count: int) -> bool:
    return re.search(rf"(?<![\w.]){count}(?![\w.])", stdout) is not None


def _objective(
    level_id: int,
    *,
    order: list[_NodeView],
    cycle: bool,
    visited: list[str],
    seed_ids: list[str],
    stdout: str,
    returned_value: Any = None,
    returned_id: str | None = None,
) -> bool:
    seed_set = set(seed_ids)
    order_ids = [view.node_id for view in order]
    visited_set = set(visited)

    if level_id == 1:
        return seed_set.issubset(visited_set)

    if level_id == 2:
        if isinstance(returned_value, int) and not isinstance(returned_value, bool):
            if returned_value == len(seed_ids):
                return True
        return seed_set.issubset(visited_set) and _stdout_has_count(stdout, len(seed_ids))

    if level_id == 3:
        return bool(visited) and visited[-1] == seed_ids[-1]

    if level_id == 4:
        if len(order) != len(seed_ids) + 1 or len(order) < 2:
            return False
        inserted = order[1]
        return (
            inserted.node_id not in seed_set
            or inserted.category == "cafe"
            or "caf" in inserted.name.lower()
        )

    if level_id == 5:
        return (
            not cycle
            and len(order) == len(seed_ids) - 1
            and bool(order_ids)
            and order_ids[0] == seed_ids[0]
        )

    if level_id == 6:
        return (
            not cycle
            and len(order) == len(seed_ids) + 1
            and bool(order_ids)
            and order_ids[-1] not in seed_set
        )

    if level_id in {7, 16}:
        reversed_ids = list(reversed(seed_ids))
        if cycle or order_ids != reversed_ids:
            return False
        return level_id != 16 or _prev_links_are_consistent(order)

    if level_id == 8:
        return cycle and len(order) == len(seed_ids) and set(order_ids) == seed_set

    if level_id == 9:
        return seed_set.issubset(visited_set) and seed_set.issubset(set(order_ids))

    if level_id == 10:
        found = returned_value is True or returned_value == 1
        if not found:
            found = bool(re.search(r"\b(true|cycle)\b", stdout, re.IGNORECASE))
        return found and seed_set.issubset(visited_set)

    if level_id == 11:
        return (
            returned_id is not None
            and returned_id == seed_ids[0]
            and seed_set.issubset(visited_set)
        )

    if level_id == 12:
        if cycle or order_ids != seed_ids:
            return False
        return _prev_links_are_consistent(order)

    if level_id == 13:
        if not visited or visited[-1] != seed_ids[0]:
            return False
        positions = {node_id: index for index, node_id in enumerate(seed_ids)}
        steps = [positions[node_id] for node_id in visited if node_id in positions]
        return any(later < earlier for earlier, later in zip(steps, steps[1:]))

    if level_id == 14:
        return not cycle and 2 <= len(order) < len(seed_ids)

    if level_id == 15:
        if len(seed_ids) < 4:
            return False
        expected = [seed_ids[1], seed_ids[0], seed_ids[3], seed_ids[2]]
        return not cycle and order_ids == expected

    return bool(visited)


def _prev_links_are_consistent(order: list[_NodeView]) -> bool:
    views = {view.node_id: view for view in order}
    for view in order:
        if view.next_id is not None and view.next_id in views:
            if views[view.next_id].prev_id != view.node_id:
                return False
    return True


# ── Python runner ──────────────────────────────────────────────────────────


def _format_error(exc: BaseException) -> str:
    if isinstance(exc, (ValidationError, InfiniteLoopError, TimeoutError)):
        return str(exc)
    message = str(exc).strip()
    name = type(exc).__name__
    return f"{name}: {message}" if message else name


def _empty_metrics(trace: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "pointer_reads": sum(event.get("action") == "POINTER_READ" for event in trace),
        "pointer_writes": sum(event.get("action") == "POINTER_WRITE" for event in trace),
        "auxiliary_space_bytes": 0,
    }


def _failed_result(
    timeline: list[dict[str, Any]],
    trace: list[dict[str, Any]],
    error: str,
    stdout: str = "",
) -> RunResult:
    return RunResult(
        success=False,
        stars_earned=0,
        star_details={"objective": False, "optimal_hops": False, "in_place_memory": False},
        metrics=_empty_metrics(trace),
        timeline=timeline,
        stdout=stdout,
        error=error,
    )


def run_submission(code: str, level_id: int = 1, language: str = "python") -> RunResult:
    if language in {"java", "cpp"}:
        return _run_compiled_submission(code, level_id, language)

    started = time.monotonic()
    circular = level_id in CIRCULAR_LEVELS
    doubly = level_id in DOUBLY_LEVELS
    head, nodes = _build_chain(circular, doubly)
    seed_ids = [node.node_id for node in nodes]
    timeline: list[dict[str, Any]] = [
        {"action": "INITIAL_STATE", "nodes": [node.snapshot() for node in nodes]}
    ]
    clear_trace()
    # The traveler always starts at the head of the route.
    visit(head)
    output = io.StringIO()
    instruction_count = 0
    returned_value: Any = None

    def guard(_frame: Any, event: str, _arg: Any) -> Any:
        nonlocal instruction_count
        if event == "line":
            instruction_count += 1
            if instruction_count > MAX_POINTER_OPS:
                raise InfiniteLoopError(
                    "Roundabout Alert! Your program exceeded the execution limit."
                )
            if time.monotonic() - started > 3:
                raise TimeoutError(
                    "Your itinerary took too long to finish. Check your loop termination condition."
                )
        return guard

    previous_trace = sys.gettrace()
    try:
        tree = validate_code(code)
        namespace: dict[str, Any] = {"__builtins__": _safe_builtins(), "Node": Node}
        sys.settrace(guard)
        try:
            with redirect_stdout(output):
                exec(compile(tree, "<wanderlist>", "exec"), namespace)
                function = _find_function(namespace)
                returned_value = function(head)
        finally:
            sys.settrace(previous_trace)
    except (Exception, SystemExit) as exc:
        sys.settrace(previous_trace)
        trace = get_trace()
        timeline.extend(trace)
        return _failed_result(timeline, trace, _format_error(exc), output.getvalue())

    trace = get_trace()
    timeline.extend(trace)
    stdout = output.getvalue()
    pointer_ops = sum(event.get("action", "").startswith("POINTER_") for event in trace)
    if pointer_ops > MAX_POINTER_OPS:
        return _failed_result(
            timeline,
            trace,
            "Roundabout Alert! Your program exceeded the pointer operation limit.",
            stdout,
        )
    if time.monotonic() - started > 3:
        return _failed_result(
            timeline,
            trace,
            "Your itinerary took too long to finish. Check your loop termination condition.",
            stdout,
        )

    views = _views_from_timeline(timeline[0], timeline)
    start_id = _infer_start(views, seed_ids)
    order, cycle = _walk_views(start_id, views)
    visited = [
        event["node_id"]
        for event in trace
        if event.get("action") == "VISIT_NODE" and isinstance(event.get("node_id"), str)
    ]
    returned_id = returned_value.node_id if isinstance(returned_value, Node) else None
    try:
        objective = _objective(
            level_id,
            order=order,
            cycle=cycle,
            visited=visited,
            seed_ids=seed_ids,
            stdout=stdout,
            returned_value=returned_value,
            returned_id=returned_id,
        )
    except Exception:
        objective = False

    reads = sum(event.get("action") == "POINTER_READ" for event in trace)
    writes = sum(event.get("action") == "POINTER_WRITE" for event in trace)
    optimal_hops = pointer_ops <= max(1, len(nodes) * 5)
    allowed_new_nodes = 1 if level_id in LEVELS_WITH_NEW_NODE else 0
    in_place_memory = dynamic_node_count() <= allowed_new_nodes
    stars = int(objective) + int(optimal_hops) + int(in_place_memory)

    return RunResult(
        success=objective,
        stars_earned=min(3, stars) if objective else 0,
        star_details={
            "objective": objective,
            "optimal_hops": optimal_hops,
            "in_place_memory": in_place_memory,
        },
        metrics={
            "pointer_reads": reads,
            "pointer_writes": writes,
            "auxiliary_space_bytes": 0,
        },
        timeline=timeline,
        stdout=stdout,
        error=None,
    )


# ── Compiled languages ─────────────────────────────────────────────────────


def _initial_state_json(circular: bool = False, doubly: bool = False) -> str:
    nodes = []
    count = len(SEED_NODES)
    for index, (name, category, _lat, _lng) in enumerate(SEED_NODES, start=1):
        next_id = f"node_{index + 1}" if index < count else (f"node_1" if circular else None)
        prev_id = f"node_{index - 1}" if index > 1 else (f"node_{count}" if (circular and doubly) else None)
        if not doubly:
            prev_id = None
        nodes.append(
            {"id": f"node_{index}", "name": name, "category": category, "next": next_id, "prev": prev_id}
        )
    return json.dumps({"action": "INITIAL_STATE", "nodes": nodes})


def _embed_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def _link_setup(circular: bool, doubly: bool) -> str:
    statements = [
        "n2.prev = &n1;", "n3.prev = &n2;", "n4.prev = &n3;",
    ] if doubly else []
    if circular:
        statements.append("n4.next = &n1;")
        if doubly:
            statements.append("n1.prev = &n4;")
    return " ".join(statements)


def _link_setup_java(circular: bool, doubly: bool) -> str:
    statements = [
        "n2.prev = n1;", "n3.prev = n2;", "n4.prev = n3;",
    ] if doubly else []
    if circular:
        statements.append("n4.next = n1;")
        if doubly:
            statements.append("n1.prev = n4;")
    return " ".join(statements)


def _cpp_source(code: str, circular: bool, doubly: bool) -> str:
    template = r'''
#include <iostream>
#include <string>
#include <cstddef>
#include <type_traits>

static bool g_wander_tracing = false;
static int g_wander_node_counter = 0;

struct WNode;

static void wander_emit_read(const char* type, const WNode* from, const WNode* target);
static void wander_emit_write(const char* type, const WNode* from, const WNode* target);

struct WanderLink {
  WNode* node = nullptr;
  WNode* owner = nullptr;
  const char* kind = "next";
  WanderLink() = default;
  WanderLink(WNode* owner_node, const char* link_kind) : owner(owner_node), kind(link_kind) {}
  WanderLink& operator=(WNode* value);
  operator WNode*() const;
  WNode* operator->() const { return node; }
  bool operator==(std::nullptr_t) const { return node == nullptr; }
  bool operator!=(std::nullptr_t) const { return node != nullptr; }
  bool operator==(const WNode* other) const { return node == other; }
  bool operator!=(const WNode* other) const { return node != other; }
};

struct WNode {
  std::string name;
  std::string id;
  WanderLink next;
  WanderLink prev;
  explicit WNode(std::string value) : name(value), next(this, "next"), prev(this, "prev") {
    id = "node_" + std::to_string(++g_wander_node_counter);
    if (g_wander_tracing) {
      std::cout << "{\"action\":\"NODE_CREATED\",\"node\":{\"id\":\"" << id
                << "\",\"name\":\"" << name << "\",\"category\":\"landmark\"}}" << std::endl;
    }
  }
};

static std::string wander_id(const WNode* node) { return node ? node->id : std::string("None"); }

static void wander_emit_read(const char* type, const WNode* from, const WNode* target) {
  if (!g_wander_tracing || !from) return;
  std::cout << "{\"action\":\"POINTER_READ\",\"type\":\"" << type << "\",\"from\":\""
            << from->id << "\",\"target\":\"" << wander_id(target) << "\"}" << std::endl;
  if (target) {
    std::cout << "{\"action\":\"VISIT_NODE\",\"node_id\":\"" << target->id << "\"}" << std::endl;
  }
}

static void wander_emit_write(const char* type, const WNode* from, const WNode* target) {
  if (!g_wander_tracing || !from) return;
  std::cout << "{\"action\":\"POINTER_WRITE\",\"type\":\"" << type << "\",\"from\":\""
            << from->id << "\",\"new_target\":\"" << wander_id(target) << "\"}" << std::endl;
}

WanderLink& WanderLink::operator=(WNode* value) { wander_emit_write(kind, owner, value); node = value; return *this; }
WanderLink::operator WNode*() const { wander_emit_read(kind, owner, node); return node; }

using Node = WNode;

static void wander_report_result(bool value) {
  std::cout << "{\"action\":\"SOLVE_RESULT\",\"value\":" << (value ? "true" : "false") << "}" << std::endl;
}

static void wander_report_result(WNode* value) {
  if (value) {
    std::cout << "{\"action\":\"SOLVE_RESULT\",\"node_id\":\"" << value->id << "\"}" << std::endl;
  } else {
    std::cout << "{\"action\":\"SOLVE_RESULT\",\"node_id\":null}" << std::endl;
  }
}

template <typename T>
static void wander_report_result(const T& value) {
  if constexpr (std::is_arithmetic_v<T>) {
    std::cout << "{\"action\":\"SOLVE_RESULT\",\"value\":" << value << "}" << std::endl;
  }
}

template <typename F>
static void wander_call_solve(F&& fn) {
  using R = decltype(fn());
  if constexpr (std::is_void_v<R>) {
    fn();
  } else {
    auto result = fn();
    wander_report_result(result);
  }
}

@CODE@

int main() {
  WNode n1("Grand Hotel"), n2("Café de Flore"), n3("City Museum"), n4("Clock Tower");
  n1.next = &n2; n2.next = &n3; n3.next = &n4;
  @LINKS@
  std::cout << "@INITIAL@" << std::endl;
  std::cout << "{\"action\":\"VISIT_NODE\",\"node_id\":\"node_1\"}" << std::endl;
  g_wander_tracing = true;
  wander_call_solve([&]() { return solve(&n1); });
  return 0;
}
'''
    return (
        template.replace("@CODE@", code)
        .replace("@LINKS@", _link_setup(circular, doubly))
        .replace("@INITIAL@", _embed_string(_initial_state_json(circular, doubly)))
    )


def _java_solve_call(code: str) -> str:
    if re.search(r"\bboolean\s+solve\s*\(", code):
        return (
            'boolean wanderResult = solve(n1);\n'
            '    System.out.println("{\\\"action\\\":\\\"SOLVE_RESULT\\\",\\\"value\\\":" + wanderResult + "}");'
        )
    if re.search(r"\b(int|long)\s+solve\s*\(", code):
        return (
            'long wanderResult = solve(n1);\n'
            '    System.out.println("{\\\"action\\\":\\\"SOLVE_RESULT\\\",\\\"value\\\":" + wanderResult + "}");'
        )
    if re.search(r"\b(double|float)\s+solve\s*\(", code):
        return (
            'double wanderResult = solve(n1);\n'
            '    System.out.println("{\\\"action\\\":\\\"SOLVE_RESULT\\\",\\\"value\\\":" + wanderResult + "}");'
        )
    if re.search(r"\bNode\s+solve\s*\(", code):
        return (
            'Node wanderResult = solve(n1);\n'
            '    if (wanderResult != null) {\n'
            '      System.out.println("{\\\"action\\\":\\\"SOLVE_RESULT\\\",\\\"node_id\\\":\\\"" + wanderResult.id + "\\\"}");\n'
            '    } else {\n'
            '      System.out.println("{\\\"action\\\":\\\"SOLVE_RESULT\\\",\\\"node_id\\\":null}");\n'
            '    }'
        )
    return 'solve(n1);'


def _instrument_java(code: str) -> str:
    code = re.sub(r"\.next\s*=(?!=)\s*([^;]+);", r".setNext(\1);", code)
    code = re.sub(r"\.prev\s*=(?!=)\s*([^;]+);", r".setPrev(\1);", code)
    code = re.sub(r"\.next\b(?!\s*\()", r".getNext()", code)
    code = re.sub(r"\.prev\b(?!\s*\()", r".getPrev()", code)
    return code


def _java_source(code: str, circular: bool, doubly: bool) -> str:
    template = r'''
import java.util.*;

public class Main {
  static boolean wanderTracing = false;
  static int wanderNodeCounter = 0;

  static class Node {
    String name;
    String id;
    Node next;
    Node prev;
    Node(String value) {
      name = value;
      id = "node_" + (++wanderNodeCounter);
      if (wanderTracing) {
        System.out.println("{\"action\":\"NODE_CREATED\",\"node\":{\"id\":\"" + id + "\",\"name\":\"" + name + "\",\"category\":\"landmark\"}}");
      }
    }
    Node getNext() { wanderEmitRead("next", this, next); return next; }
    void setNext(Node target) { wanderEmitWrite("next", this, target); next = target; }
    Node getPrev() { wanderEmitRead("prev", this, prev); return prev; }
    void setPrev(Node target) { wanderEmitWrite("prev", this, target); prev = target; }
  }

  static String wanderId(Node node) { return node == null ? "None" : node.id; }

  static void wanderEmitRead(String type, Node from, Node target) {
    if (!wanderTracing) return;
    System.out.println("{\"action\":\"POINTER_READ\",\"type\":\"" + type + "\",\"from\":\"" + from.id + "\",\"target\":\"" + wanderId(target) + "\"}");
    if (target != null) {
      System.out.println("{\"action\":\"VISIT_NODE\",\"node_id\":\"" + target.id + "\"}");
    }
  }

  static void wanderEmitWrite(String type, Node from, Node target) {
    if (!wanderTracing) return;
    System.out.println("{\"action\":\"POINTER_WRITE\",\"type\":\"" + type + "\",\"from\":\"" + from.id + "\",\"new_target\":\"" + wanderId(target) + "\"}");
  }

@CODE@

  public static void main(String[] args) {
    Node n1 = new Node("Grand Hotel"), n2 = new Node("Café de Flore"), n3 = new Node("City Museum"), n4 = new Node("Clock Tower");
    n1.next = n2; n2.next = n3; n3.next = n4;
    @LINKS@
    System.out.println("@INITIAL@");
    System.out.println("{\"action\":\"VISIT_NODE\",\"node_id\":\"node_1\"}");
    wanderTracing = true;
    @SOLVE_CALL@
  }
}
'''
    instrumented = _instrument_java(code)
    return (
        template.replace("@CODE@", instrumented)
        .replace("@LINKS@", _link_setup_java(circular, doubly))
        .replace("@INITIAL@", _embed_string(_initial_state_json(circular, doubly)))
        .replace("@SOLVE_CALL@", _java_solve_call(code))
    )


def _parse_compiled_output(stdout: str) -> tuple[list[dict[str, Any]], str]:
    timeline: list[dict[str, Any]] = []
    output_lines: list[str] = []
    for line in stdout.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        try:
            event = json.loads(stripped)
        except json.JSONDecodeError:
            output_lines.append(line)
            continue
        if isinstance(event, dict) and isinstance(event.get("action"), str):
            timeline.append(event)
        else:
            output_lines.append(line)
    return timeline, "\n".join(output_lines)


def _compiled_result(
    process: subprocess.CompletedProcess[str],
    language: str,
    level_id: int,
    seed_ids: list[str],
) -> RunResult:
    timeline, stdout = _parse_compiled_output(process.stdout or "")
    stderr = (process.stderr or "").strip()
    error = stderr if process.returncode != 0 else None
    if process.returncode != 0 and not error:
        error = f"{language.upper()} submission exited with code {process.returncode}."

    if error:
        return RunResult(
            success=False,
            stars_earned=0,
            star_details={"objective": False, "optimal_hops": False, "in_place_memory": False},
            metrics=_empty_metrics(timeline),
            timeline=timeline,
            stdout=stdout,
            error=error,
        )

    initial = next(
        (event for event in timeline if event.get("action") == "INITIAL_STATE"), None
    )
    if initial is None:
        initial = {"action": "INITIAL_STATE", "nodes": []}
        timeline.insert(0, initial)
    views = _views_from_timeline(initial, timeline)
    start_id = _infer_start(views, seed_ids)
    order, cycle = _walk_views(start_id, views)
    visited = [
        event["node_id"]
        for event in timeline
        if event.get("action") == "VISIT_NODE" and isinstance(event.get("node_id"), str)
    ]
    returned_value: Any = None
    returned_id: str | None = None
    for event in timeline:
        if event.get("action") != "SOLVE_RESULT":
            continue
        if "node_id" in event:
            node_id = event.get("node_id")
            returned_id = node_id if isinstance(node_id, str) else None
        if "value" in event:
            returned_value = event.get("value")
    try:
        objective = _objective(
            level_id,
            order=order,
            cycle=cycle,
            visited=visited,
            seed_ids=seed_ids,
            stdout=stdout,
            returned_value=returned_value,
            returned_id=returned_id,
        )
    except Exception:
        objective = False

    pointer_ops = sum(event.get("action", "").startswith("POINTER_") for event in timeline)
    optimal_hops = pointer_ops <= max(1, len(seed_ids) * 5)
    stars = int(objective) + int(optimal_hops) + 1
    return RunResult(
        success=objective,
        stars_earned=min(3, stars) if objective else 0,
        star_details={
            "objective": objective,
            "optimal_hops": optimal_hops,
            "in_place_memory": True,
        },
        metrics=_empty_metrics(timeline),
        timeline=timeline,
        stdout=stdout,
        error=None,
    )


def _run_compiled_submission(code: str, level_id: int, language: str) -> RunResult:
    seed_ids = [f"node_{index}" for index in range(1, len(SEED_NODES) + 1)]
    if len(code) > 20_000:
        return RunResult(
            False, 0,
            {"objective": False, "optimal_hops": False, "in_place_memory": False},
            {"pointer_reads": 0, "pointer_writes": 0, "auxiliary_space_bytes": 0},
            [], "", "Code must be at most 20000 characters.",
        )
    forbidden_tokens = (
        "#include", "import ", "system(", "ProcessBuilder", "Runtime.getRuntime",
        "fstream", "FileInputStream", "ofstream", "ifstream",
    )
    if any(token in code for token in forbidden_tokens):
        return RunResult(
            False, 0,
            {"objective": False, "optimal_hops": False, "in_place_memory": False},
            {"pointer_reads": 0, "pointer_writes": 0, "auxiliary_space_bytes": 0},
            [], "", "Imports, process access, and filesystem access are not allowed.",
        )
    circular = level_id in CIRCULAR_LEVELS
    doubly = level_id in DOUBLY_LEVELS
    try:
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
            if language == "cpp":
                source = _cpp_source(code, circular, doubly)
                source_path = os.path.join(temp_dir, "main.cpp")
                executable = os.path.join(temp_dir, "wander.exe" if os.name == "nt" else "wander")
                with open(source_path, "w", encoding="utf-8") as file:
                    file.write(source)
                subprocess.run(
                    ["g++", "-std=c++17", source_path, "-O2", "-o", executable],
                    capture_output=True, text=True, timeout=10, check=True,
                )
                process = subprocess.run([executable], capture_output=True, text=True, timeout=3)
            else:
                source = _java_source(code, circular, doubly)
                source_path = os.path.join(temp_dir, "Main.java")
                with open(source_path, "w", encoding="utf-8") as file:
                    file.write(source)
                subprocess.run(
                    ["javac", source_path], capture_output=True, text=True, timeout=10, check=True,
                )
                process = subprocess.run(
                    ["java", "-cp", temp_dir, "Main"], capture_output=True, text=True, timeout=3,
                )
            return _compiled_result(process, language, level_id, seed_ids)
    except FileNotFoundError:
        tool = "g++" if language == "cpp" else "javac/java"
        return RunResult(
            False, 0,
            {"objective": False, "optimal_hops": False, "in_place_memory": False},
            {"pointer_reads": 0, "pointer_writes": 0, "auxiliary_space_bytes": 0},
            [], "", f"{language.upper()} toolchain unavailable: `{tool}` was not found.",
        )
    except subprocess.TimeoutExpired as exc:
        partial = exc.stdout or ""
        if isinstance(partial, bytes):
            partial = partial.decode("utf-8", "replace")
        timeline, stdout = _parse_compiled_output(partial)
        return RunResult(
            False, 0,
            {"objective": False, "optimal_hops": False, "in_place_memory": False},
            _empty_metrics(timeline),
            timeline, stdout, f"{language.upper()} code exceeded the 3-second execution limit.",
        )
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or str(exc)).strip()
        return RunResult(
            False, 0,
            {"objective": False, "optimal_hops": False, "in_place_memory": False},
            {"pointer_reads": 0, "pointer_writes": 0, "auxiliary_space_bytes": 0},
            [], "", f"Compilation Error:\n{detail}",
        )
    except OSError as exc:
        return RunResult(
            False, 0,
            {"objective": False, "optimal_hops": False, "in_place_memory": False},
            {"pointer_reads": 0, "pointer_writes": 0, "auxiliary_space_bytes": 0},
            [], "", f"Execution Error: {exc}",
        )
