"""Execution and scoring for linked-list submissions."""

from __future__ import annotations

import builtins
import io
import json
import os
import subprocess
import sys
import tempfile
import time
from contextlib import redirect_stdout
from dataclasses import dataclass
from typing import Any

from .itinerary import Node, clear_trace, emit, get_trace
from .validator import MAX_LOOP_VISITS, MAX_POINTER_OPS, ValidationError, validate_code


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


def _build_chain(circular: bool = False, doubly: bool = False) -> tuple[Node, list[Node]]:
    nodes = [
        Node("Grand Hotel", "hotel", 48.86, 2.34, node_id=f"node_{index}")
        for index in range(1, 5)
    ]
    for left, right in zip(nodes, nodes[1:]):
        left.next = right
        if doubly:
            right.prev = left
    if circular:
        nodes[-1].next = nodes[0]
        if doubly:
            nodes[0].prev = nodes[-1]
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
        "isinstance", "int", "str", "bool",
    )
    return {name: getattr(builtins, name) for name in allowed}


def run_submission(code: str, level_id: int = 1, language: str = "python") -> RunResult:
    if language in {"java", "cpp"}:
        return _run_compiled_submission(code, level_id, language)
    started = time.monotonic()
    timeline: list[dict[str, Any]] = []
    try:
        tree = validate_code(code)
        circular = level_id in {9, 10, 11, 12}
        doubly = level_id in {13, 14, 15, 16}
        head, nodes = _build_chain(circular, doubly)
        timeline.append({"action": "INITIAL_STATE", "nodes": [node.snapshot() for node in nodes]})
        clear_trace()
        output = io.StringIO()
        namespace: dict[str, Any] = {"__builtins__": _safe_builtins(), "Node": Node}
        instruction_count = 0

        def guard(_frame: Any, event: str, _arg: Any) -> Any:
            nonlocal instruction_count
            if event == "line":
                instruction_count += 1
                if instruction_count > MAX_POINTER_OPS:
                    raise InfiniteLoopError("Roundabout Alert! Your program exceeded the execution limit.")
                if time.monotonic() - started > 3:
                    raise TimeoutError("Your itinerary took too long to finish. Check your loop termination condition.")
            return guard

        previous_trace = sys.gettrace()
        sys.settrace(guard)
        try:
            exec(compile(tree, "<wanderlist>", "exec"), namespace)
            function = _find_function(namespace)
            with redirect_stdout(output):
                function(head)
        finally:
            sys.settrace(previous_trace)
        trace = get_trace()
        timeline.extend(trace)
        timeline.extend({"action": "VISIT_NODE", "node_id": node.node_id} for node in nodes)
        pointer_ops = sum(event["action"].startswith("POINTER_") for event in trace)
        if pointer_ops > MAX_POINTER_OPS:
            raise InfiniteLoopError("Roundabout Alert! Your program exceeded 5,000 pointer operations.")
        if time.monotonic() - started > 3:
            raise TimeoutError("Your itinerary took too long to finish. Check your loop termination condition.")
        reads = sum(event["action"] == "POINTER_READ" for event in trace)
        writes = sum(event["action"] == "POINTER_WRITE" for event in trace)
        objective = _validate_result(level_id, head, nodes)
        stars = int(objective) + int(pointer_ops <= max(1, len(nodes) * 5)) + int(doubly or level_id in {1, 2, 3, 4})
        return RunResult(True, min(3, stars), {
            "objective": objective,
            "optimal_hops": pointer_ops <= max(1, len(nodes) * 5),
            "in_place_memory": doubly or level_id in {1, 2, 3, 4},
        }, {"pointer_reads": reads, "pointer_writes": writes, "auxiliary_space_bytes": 0}, timeline, output.getvalue(), None)
    except (
        ValidationError, InfiniteLoopError, TimeoutError, AttributeError, NameError,
        TypeError, ValueError, ZeroDivisionError, RecursionError, KeyError,
        IndexError, RuntimeError,
    ) as exc:
        trace = get_trace()
        timeline.extend(trace)
        return RunResult(False, 0, {"objective": False, "optimal_hops": False, "in_place_memory": False},
                         {"pointer_reads": sum(e["action"] == "POINTER_READ" for e in trace),
                          "pointer_writes": sum(e["action"] == "POINTER_WRITE" for e in trace),
                          "auxiliary_space_bytes": 0}, timeline, "", str(exc))


def _validate_result(level_id: int, head: Node, nodes: list[Node]) -> bool:
    if level_id == 8:
        seen: set[int] = set()
        current = head
        while current is not None and id(current) not in seen:
            seen.add(id(current))
            current = current.next
        return len(seen) == len(nodes)
    return head is not None


def _compiled_result(
    process: subprocess.CompletedProcess[str],
    language: str,
    elapsed: float,
) -> RunResult:
    timeline: list[dict[str, Any]] = []
    stdout_lines = process.stdout.splitlines()
    for line in stdout_lines:
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(event, dict):
            timeline.append(event)

    error = process.stderr.strip() or None
    if process.returncode != 0:
        error = error or f"{language.upper()} submission exited with code {process.returncode}."
    reads = sum(event.get("action") == "POINTER_READ" for event in timeline)
    writes = sum(event.get("action") == "POINTER_WRITE" for event in timeline)
    success = process.returncode == 0 and error is None
    return RunResult(
        success=success,
        stars_earned=3 if success else 0,
        star_details={"objective": success, "optimal_hops": success, "in_place_memory": success},
        metrics={"pointer_reads": reads, "pointer_writes": writes, "auxiliary_space_bytes": 0},
        timeline=timeline,
        stdout="\n".join(stdout_lines),
        error=error,
    )


def _run_compiled_submission(code: str, level_id: int, language: str) -> RunResult:
    if len(code) > 20_000:
        return RunResult(False, 0, {"objective": False, "optimal_hops": False, "in_place_memory": False},
                         {"pointer_reads": 0, "pointer_writes": 0, "auxiliary_space_bytes": 0}, [], "", "Code must be at most 20000 characters.")
    forbidden_tokens = ("#include", "import ", "system(", "ProcessBuilder", "Runtime.getRuntime", "fstream", "FileInputStream")
    if any(token in code for token in forbidden_tokens):
        return RunResult(False, 0, {"objective": False, "optimal_hops": False, "in_place_memory": False},
                         {"pointer_reads": 0, "pointer_writes": 0, "auxiliary_space_bytes": 0}, [], "", "Imports, process access, and filesystem access are not allowed.")
    circular = level_id in {9, 10, 11, 12}
    doubly = level_id in {13, 14, 15, 16}
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
            return _compiled_result(process, language, 0)
    except FileNotFoundError:
        tool = "g++" if language == "cpp" else "javac/java"
        return RunResult(False, 0, {"objective": False, "optimal_hops": False, "in_place_memory": False},
                         {"pointer_reads": 0, "pointer_writes": 0, "auxiliary_space_bytes": 0}, [], "", f"{language.upper()} toolchain unavailable: `{tool}` was not found.")
    except subprocess.TimeoutExpired:
        return RunResult(False, 0, {"objective": False, "optimal_hops": False, "in_place_memory": False},
                         {"pointer_reads": 0, "pointer_writes": 0, "auxiliary_space_bytes": 0}, [], "", f"{language.upper()} code exceeded the 3-second execution limit.")
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or str(exc)).strip()
        return RunResult(False, 0, {"objective": False, "optimal_hops": False, "in_place_memory": False},
                         {"pointer_reads": 0, "pointer_writes": 0, "auxiliary_space_bytes": 0}, [], "", f"Compilation Error:\n{detail}")


def _cpp_source(code: str, circular: bool, doubly: bool) -> str:
    return f"""
#include <iostream>
#include <string>
struct Node {{
  std::string name; Node* next = nullptr; Node* prev = nullptr;
  Node(std::string value) : name(value) {{}}
}};
void emit(const char* action, const char* type, const Node* from, const Node* target) {{
  std::cout << "{{\\\"action\\\":\\\"" << action << "\\\",\\\"type\\\":\\\"" << type
            << "\\\",\\\"from\\\":\\\"node_" << (from ? from->name : "none")
            << "\\\",\\\"target\\\":\\\"" << (target ? target->name : "None") << "\\\"}}" << std::endl;
}}
{code}
int main() {{
  Node n1("1"), n2("2"), n3("3"), n4("4");
  n1.next=&n2; n2.next=&n3; n3.next=&n4;
  {( "n4.next=&n1;" if circular else "" )}
  {( "n2.prev=&n1; n3.prev=&n2; n4.prev=&n3;" + (" n1.prev=&n4;" if circular else "") if doubly else "" )}
  solve(&n1);
  return 0;
}}
"""


def _java_source(code: str, circular: bool, doubly: bool) -> str:
    return f"""
import java.util.*;
public class Main {{
  static class Node {{
    String name; Node next; Node prev;
    Node(String value) {{ name = value; }}
  }}
  {code}
  public static void main(String[] args) {{
    Node n1=new Node("1"), n2=new Node("2"), n3=new Node("3"), n4=new Node("4");
    n1.next=n2; n2.next=n3; n3.next=n4;
    {( "n4.next=n1;" if circular else "" )}
    {( "n2.prev=n1; n3.prev=n2; n4.prev=n3;" + (" n1.prev=n4;" if circular else "") if doubly else "" )}
    solve(n1);
  }}
}}
"""
