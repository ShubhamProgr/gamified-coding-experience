"""Execution and scoring for Temple of Echoes (Hanoi recursion) submissions."""

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

from .hanoi import (
    MAX_MOVES,
    Disk,
    Peg,
    TooManyMovesError,
    build_pegs,
    clear_trace,
    get_move_count,
    get_trace,
    snapshot_pegs,
)
from .validator import MAX_CODE_LENGTH, ValidationError, validate_code

MAX_INSTRUCTIONS = 50_000
MAX_SECONDS = 5.0
RECURSION_LIMIT = 300


@dataclass
class TempleRunResult:
    success: bool
    stars_earned: int
    star_details: dict[str, bool]
    metrics: dict[str, int]
    timeline: list[dict[str, Any]]
    stdout: str
    error: str | None

    def as_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


def _safe_builtins() -> dict[str, Any]:
    allowed = (
        "abs", "all", "any", "enumerate", "len", "max", "min", "range",
        "print", "isinstance", "int", "str", "bool", "float", "list",
        "dict", "tuple", "set", "sorted", "sum", "reversed", "zip",
        "ValueError", "TypeError", "Exception", "RuntimeError",
    )
    return {name: getattr(builtins, name) for name in allowed}


def _level_config(level_id: int) -> tuple[int, int]:
    table = {
        1: (1, 3), 2: (2, 3), 3: (3, 3),
        4: (3, 3), 5: (4, 3), 6: (3, 3),
        7: (4, 3), 8: (5, 3), 9: (3, 3),
        10: (4, 4), 11: (5, 4), 12: (6, 3),
    }
    return table.get(level_id, (3, 3))


def _find_function(namespace: dict[str, Any]) -> Any:
    for name in ("hanoi", "solve", "tower", "move_disks"):
        candidate = namespace.get(name)
        if callable(candidate):
            return candidate
    raise ValidationError(
        "Define a function named hanoi(n, source, aux, target) in your submission."
    )


def _validate_final_state(pegs: dict[str, Peg], n: int) -> bool:
    target = pegs.get("C")
    if target is None:
        return False
    return [disk.size for disk in target._stack] == list(range(n, 0, -1))


def _format_error(exc: BaseException) -> str:
    if isinstance(exc, (ValidationError, TooManyMovesError, TimeoutError)):
        return str(exc)
    if isinstance(exc, RecursionError):
        message = str(exc).strip()
        if "maximum recursion depth" in message.lower():
            return (
                "The temple trembles! Your recursion ran too deep or too long. "
                "Check your base case."
            )
        return message or "The temple trembles! Check your base case."
    message = str(exc).strip()
    name = type(exc).__name__
    return f"{name}: {message}" if message else name


def _failed_result(
    timeline: list[dict[str, Any]],
    n_disks: int,
    instruction_count: int,
    error: str,
) -> TempleRunResult:
    return TempleRunResult(
        success=False,
        stars_earned=0,
        star_details={"objective": False, "optimal_moves": False, "no_globals": False},
        metrics={
            "move_count": get_move_count(),
            "instruction_count": instruction_count,
            "disk_count": n_disks,
        },
        timeline=timeline,
        stdout="",
        error=error,
    )


def run_submission(
    code: str, level_id: int = 1, language: str = "python"
) -> TempleRunResult:
    if language in {"java", "cpp"}:
        return _run_compiled_submission(code, level_id, language)

    n_disks, n_pegs = _level_config(level_id)
    optimal_moves = (2 ** n_disks) - 1
    started = time.monotonic()
    instruction_count = 0
    output = io.StringIO()
    pegs = build_pegs(n_disks, n_pegs)
    timeline: list[dict[str, Any]] = [
        {"action": "INITIAL_STATE", "pegs": snapshot_pegs(pegs)}
    ]
    clear_trace()
    previous_trace = sys.gettrace()
    previous_limit = sys.getrecursionlimit()

    def guard(_frame: Any, event: str, _arg: Any) -> Any:
        nonlocal instruction_count
        if event == "line":
            instruction_count += 1
            if instruction_count > MAX_INSTRUCTIONS:
                raise RecursionError(
                    "The temple trembles! Your recursion ran too deep or too long. "
                    "Check your base case."
                )
            if instruction_count % 256 == 0 and time.monotonic() - started > MAX_SECONDS:
                raise TimeoutError(
                    "Execution exceeded 5 seconds. Check your base case."
                )
        return guard

    try:
        tree = validate_code(code)
        namespace: dict[str, Any] = {
            "__builtins__": _safe_builtins(),
            "Peg": Peg,
            "Disk": Disk,
            **{pid: peg for pid, peg in pegs.items()},
        }
        sys.setrecursionlimit(RECURSION_LIMIT)
        sys.settrace(guard)
        try:
            with redirect_stdout(output):
                exec(compile(tree, "<temple>", "exec"), namespace)
                function = _find_function(namespace)
                function(n_disks, pegs["A"], pegs["B"], pegs["C"])
        finally:
            sys.settrace(previous_trace)
            sys.setrecursionlimit(previous_limit)
    except (Exception, SystemExit) as exc:
        sys.settrace(previous_trace)
        try:
            sys.setrecursionlimit(previous_limit)
        except (ValueError, RecursionError):
            pass
        timeline.extend(get_trace())
        return _failed_result(
            timeline, n_disks, instruction_count, _format_error(exc)
        )

    timeline.extend(get_trace())
    move_count = get_move_count()
    objective = _validate_final_state(pegs, n_disks)
    is_optimal = move_count <= optimal_moves
    no_globals = True
    stars = int(objective) + int(is_optimal) + int(no_globals)

    return TempleRunResult(
        success=objective,
        stars_earned=min(3, stars) if objective else 0,
        star_details={
            "objective": objective,
            "optimal_moves": is_optimal,
            "no_globals": no_globals,
        },
        metrics={
            "move_count": move_count,
            "instruction_count": instruction_count,
            "disk_count": n_disks,
        },
        timeline=timeline,
        stdout=output.getvalue(),
        error=None,
    )


def _embed_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def _initial_state_json(n_disks: int, n_pegs: int) -> str:
    pegs = build_pegs(n_disks, n_pegs)
    return json.dumps({"action": "INITIAL_STATE", "pegs": snapshot_pegs(pegs)})


def _cpp_source(code: str, n_disks: int, n_pegs: int) -> str:
    template = r'''
#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>

static int templeMoves = 0;
static const int TEMPLE_MAX_MOVES = @MAXMOVES@;

struct Disk {
  int size;
  std::string peg_id;
  Disk() : size(0), peg_id("") {}
  Disk(int value, std::string peg) : size(value), peg_id(peg) {}
};

struct Peg {
  std::string peg_id;
  std::vector<Disk> stack;
  Peg() {}
  explicit Peg(std::string id) : peg_id(id) {}
  bool empty() const { return stack.empty(); }
  Disk peek() const { return stack.back(); }
  Disk pop() {
    if (stack.empty()) {
      std::cerr << "Peg " << peg_id << " is empty. Cannot move a disc from an empty spire." << std::endl;
      std::exit(2);
    }
    Disk disk = stack.back();
    stack.pop_back();
    return disk;
  }
  void push(Disk disk) {
    if (!stack.empty() && stack.back().size < disk.size) {
      std::cerr << "Cannot place Disk(size=" << disk.size << ") on Disk(size=" << stack.back().size
                << "). Larger discs cannot sit on smaller ones - the temple collapses!" << std::endl;
      std::exit(3);
    }
    if (templeMoves >= TEMPLE_MAX_MOVES) {
      std::cerr << "Too many disk moves. The temple trembles! Check your base case." << std::endl;
      std::exit(4);
    }
    templeMoves += 1;
    std::cout << "{\"action\":\"MOVE_DISK\",\"disk_size\":" << disk.size
              << ",\"from_peg\":\"" << disk.peg_id
              << "\",\"to_peg\":\"" << peg_id
              << "\",\"move_number\":" << templeMoves << "}" << std::endl;
    disk.peg_id = peg_id;
    stack.push_back(disk);
  }
};

@DGLOBAL@

@CODE@

int main() {
  Peg A("A"), B("B"), C("C");
  for (int i = @DISKS@; i >= 1; --i) {
    A.stack.push_back(Disk(i, "A"));
  }
  std::cout << "@INITIAL@" << std::endl;
  hanoi(@DISKS@, A, B, C);
  return 0;
}
'''
    source = (
        template.replace("@MAXMOVES@", str(MAX_MOVES))
        .replace("@DGLOBAL@", 'static Peg D("D");' if n_pegs == 4 else "")
        .replace("@DISKS@", str(n_disks))
        .replace("@INITIAL@", _embed_string(_initial_state_json(n_disks, n_pegs)))
    )
    return source.replace("@CODE@", code)


def _java_source(code: str, n_disks: int, n_pegs: int) -> str:
    template = r'''
import java.util.*;

public class Main {
  static int templeMoves = 0;
  static final int TEMPLE_MAX_MOVES = @MAXMOVES@;

  static class Disk {
    int size;
    String pegId;
    Disk(int value, String peg) { size = value; pegId = peg; }
  }

  static class Peg {
    String pegId;
    ArrayList<Disk> stack = new ArrayList<>();
    Peg(String id) { pegId = id; }
    boolean isEmpty() { return stack.isEmpty(); }
    Disk peek() { return stack.get(stack.size() - 1); }
    Disk pop() {
      if (stack.isEmpty()) {
        System.err.println("Peg " + pegId + " is empty. Cannot move a disc from an empty spire.");
        System.exit(2);
      }
      return stack.remove(stack.size() - 1);
    }
    void push(Disk disk) {
      if (!stack.isEmpty() && stack.get(stack.size() - 1).size < disk.size) {
        System.err.println("Cannot place Disk(size=" + disk.size + ") on Disk(size="
            + stack.get(stack.size() - 1).size
            + "). Larger discs cannot sit on smaller ones - the temple collapses!");
        System.exit(3);
      }
      if (templeMoves >= TEMPLE_MAX_MOVES) {
        System.err.println("Too many disk moves. The temple trembles! Check your base case.");
        System.exit(4);
      }
      templeMoves += 1;
      System.out.println("{\"action\":\"MOVE_DISK\",\"disk_size\":" + disk.size
          + ",\"from_peg\":\"" + disk.pegId
          + "\",\"to_peg\":\"" + pegId
          + "\",\"move_number\":" + templeMoves + "}");
      disk.pegId = pegId;
      stack.add(disk);
    }
  }

  @DGLOBAL@

@CODE@

  public static void main(String[] args) {
    Peg A = new Peg("A"), B = new Peg("B"), C = new Peg("C");
    for (int i = @DISKS@; i >= 1; i--) {
      A.stack.add(new Disk(i, "A"));
    }
    System.out.println("@INITIAL@");
    hanoi(@DISKS@, A, B, C);
  }
}
'''
    source = (
        template.replace("@MAXMOVES@", str(MAX_MOVES))
        .replace("@DGLOBAL@", 'static Peg D = new Peg("D");' if n_pegs == 4 else "")
        .replace("@DISKS@", str(n_disks))
        .replace("@INITIAL@", _embed_string(_initial_state_json(n_disks, n_pegs)))
    )
    return source.replace("@CODE@", code)


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


def _replay_final_state(
    initial: dict[str, Any], timeline: list[dict[str, Any]]
) -> dict[str, list[int]]:
    state: dict[str, list[int]] = {}
    raw_pegs = initial.get("pegs")
    if isinstance(raw_pegs, dict):
        for peg_id, sizes in raw_pegs.items():
            if isinstance(sizes, list):
                state[str(peg_id)] = [int(size) for size in sizes if isinstance(size, int)]
    for event in timeline:
        if event.get("action") != "MOVE_DISK":
            continue
        from_peg = event.get("from_peg")
        to_peg = event.get("to_peg")
        disk_size = event.get("disk_size")
        if not isinstance(from_peg, str) or not isinstance(to_peg, str):
            continue
        if not isinstance(disk_size, int):
            continue
        source = state.get(from_peg)
        target = state.get(to_peg)
        if source is None or target is None or not source:
            continue
        if source[-1] != disk_size:
            continue
        source.pop()
        target.append(disk_size)
    return state


def _compiled_result(
    process: subprocess.CompletedProcess[str],
    language: str,
    level_id: int,
) -> TempleRunResult:
    timeline, stdout = _parse_compiled_output(process.stdout or "")
    stderr = (process.stderr or "").strip()
    n_disks, n_pegs = _level_config(level_id)
    optimal_moves = (2 ** n_disks) - 1

    initial = next(
        (event for event in timeline if event.get("action") == "INITIAL_STATE"), None
    )
    if initial is None:
        initial = {"action": "INITIAL_STATE", "pegs": snapshot_pegs(build_pegs(n_disks, n_pegs))}
        timeline.insert(0, initial)

    error = stderr if process.returncode != 0 else None
    if process.returncode != 0 and not error:
        error = f"{language.upper()} submission exited with code {process.returncode}."

    if error:
        return TempleRunResult(
            success=False,
            stars_earned=0,
            star_details={"objective": False, "optimal_moves": False, "no_globals": False},
            metrics={
                "move_count": sum(event.get("action") == "MOVE_DISK" for event in timeline),
                "instruction_count": 0,
                "disk_count": n_disks,
            },
            timeline=timeline,
            stdout=stdout,
            error=error,
        )

    final_state = _replay_final_state(initial, timeline)
    move_count = sum(event.get("action") == "MOVE_DISK" for event in timeline)
    objective = final_state.get("C") == list(range(n_disks, 0, -1))
    is_optimal = move_count <= optimal_moves
    stars = int(objective) + int(is_optimal) + 1

    return TempleRunResult(
        success=objective,
        stars_earned=min(3, stars) if objective else 0,
        star_details={
            "objective": objective,
            "optimal_moves": is_optimal,
            "no_globals": True,
        },
        metrics={
            "move_count": move_count,
            "instruction_count": 0,
            "disk_count": n_disks,
        },
        timeline=timeline,
        stdout=stdout,
        error=None,
    )


def _toolchain_unavailable(language: str, tool: str) -> TempleRunResult:
    return TempleRunResult(
        False,
        0,
        {"objective": False, "optimal_moves": False, "no_globals": False},
        {"move_count": 0, "instruction_count": 0, "disk_count": 0},
        [],
        "",
        f"{language.upper()} toolchain unavailable: `{tool}` was not found.",
    )


def _run_compiled_submission(code: str, level_id: int, language: str) -> TempleRunResult:
    if len(code) > MAX_CODE_LENGTH:
        return TempleRunResult(
            False,
            0,
            {"objective": False, "optimal_moves": False, "no_globals": False},
            {"move_count": 0, "instruction_count": 0, "disk_count": 0},
            [],
            "",
            f"Code must be at most {MAX_CODE_LENGTH} characters.",
        )

    forbidden_tokens = (
        "#include", "import ", "system(", "ProcessBuilder", "Runtime.getRuntime",
        "fstream", "FileInputStream", "ofstream", "ifstream",
    )
    if any(token in code for token in forbidden_tokens):
        return TempleRunResult(
            False,
            0,
            {"objective": False, "optimal_moves": False, "no_globals": False},
            {"move_count": 0, "instruction_count": 0, "disk_count": 0},
            [],
            "",
            "Imports, process access, and filesystem access are not allowed.",
        )

    n_disks, n_pegs = _level_config(level_id)
    try:
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
            if language == "cpp":
                source = _cpp_source(code, n_disks, n_pegs)
                source_path = os.path.join(temp_dir, "main.cpp")
                executable = os.path.join(
                    temp_dir, "temple.exe" if os.name == "nt" else "temple"
                )
                with open(source_path, "w", encoding="utf-8") as file:
                    file.write(source)
                subprocess.run(
                    ["g++", "-std=c++17", source_path, "-O2", "-o", executable],
                    capture_output=True, text=True, timeout=10, check=True,
                )
                process = subprocess.run(
                    [executable], capture_output=True, text=True, timeout=3
                )
            else:
                source = _java_source(code, n_disks, n_pegs)
                source_path = os.path.join(temp_dir, "Main.java")
                with open(source_path, "w", encoding="utf-8") as file:
                    file.write(source)
                subprocess.run(
                    ["javac", source_path],
                    capture_output=True, text=True, timeout=10, check=True,
                )
                process = subprocess.run(
                    ["java", "-cp", temp_dir, "Main"],
                    capture_output=True, text=True, timeout=3,
                )
            return _compiled_result(process, language, level_id)
    except FileNotFoundError:
        tool = "g++" if language == "cpp" else "javac/java"
        return _toolchain_unavailable(language, tool)
    except subprocess.TimeoutExpired as exc:
        partial = exc.stdout or ""
        if isinstance(partial, bytes):
            partial = partial.decode("utf-8", "replace")
        timeline, stdout = _parse_compiled_output(partial)
        return TempleRunResult(
            False,
            0,
            {"objective": False, "optimal_moves": False, "no_globals": False},
            {
                "move_count": sum(event.get("action") == "MOVE_DISK" for event in timeline),
                "instruction_count": 0,
                "disk_count": n_disks,
            },
            timeline,
            stdout,
            f"{language.upper()} code exceeded the 3-second execution limit.",
        )
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or str(exc)).strip()
        return TempleRunResult(
            False,
            0,
            {"objective": False, "optimal_moves": False, "no_globals": False},
            {"move_count": 0, "instruction_count": 0, "disk_count": n_disks},
            [],
            "",
            f"Compilation Error:\n{detail}",
        )
    except OSError as exc:
        return TempleRunResult(
            False,
            0,
            {"objective": False, "optimal_moves": False, "no_globals": False},
            {"move_count": 0, "instruction_count": 0, "disk_count": n_disks},
            [],
            "",
            f"Execution Error: {exc}",
        )
