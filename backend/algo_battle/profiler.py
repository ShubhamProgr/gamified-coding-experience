"""Isolated multi-language submission profiler.

Python submissions are executed by an in-process harness that measures each
call with ``time.perf_counter_ns`` and tracks heap peaks with ``tracemalloc``.
Java and C++ submissions are compiled once and then run with a generated
driver; their per-test timings are measured inside the driver.

All submissions run inside a short-lived subprocess with a hard wall-clock
limit so a slow/infinite solution cannot stall the duel.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path
from typing import Any

from .problems import Problem, TestCase

EXECUTION_TIMEOUT_SECONDS = 5.0
COMPILE_TIMEOUT_SECONDS = 25.0
MAX_FAILURE_DETAILS = 4

_PYTHON_DENIED_IMPORTS = {
    "os",
    "sys",
    "subprocess",
    "socket",
    "shutil",
    "pathlib",
    "ctypes",
    "multiprocessing",
    "threading",
    "importlib",
    "pickle",
    "marshal",
    "builtins",
    "resource",
    "signal",
    "pty",
    "telnetlib",
    "http",
    "urllib",
    "ftplib",
    "smtplib",
    "asyncio",
}

_PYTHON_HARNESS = r'''
import importlib.util
import json
import sys
import time
import tracemalloc

solution_path, tests_path, normalizer, function_name = sys.argv[1:5]

with open(tests_path, "r", encoding="utf-8") as handle:
    tests = json.load(handle)


def canonical(value):
    if normalizer == "bool":
        return "true" if bool(value) else "false"
    if normalizer == "int":
        try:
            return str(int(value))
        except Exception:
            return str(value)
    if normalizer == "int_list":
        try:
            return ",".join(str(int(item)) for item in sorted(value))
        except Exception:
            return str(value)
    if normalizer == "str_list":
        try:
            groups = [sorted(str(item) for item in group) for group in value]
            groups.sort()
            return "|".join(",".join(group) for group in groups)
        except Exception:
            return str(value)
    return str(value)


def emit(payload):
    sys.stdout.write("\n" + json.dumps(payload) + "\n")
    sys.stdout.flush()


try:
    spec = importlib.util.spec_from_file_location("algo_solution", solution_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["algo_solution"] = module
    spec.loader.exec_module(module)
except Exception as exc:
    emit({
        "passed_count": 0,
        "total_count": len(tests),
        "time_ms": 0.0,
        "memory_kb": 0.0,
        "error": f"ImportError: {exc!r}",
        "failures": [],
        "largest_ms": 0.0,
        "largest_n": 0,
    })
    raise SystemExit(0)

try:
    if hasattr(module, "Solution"):
        target = getattr(module.Solution(), function_name)
    else:
        target = getattr(module, function_name)
except Exception as exc:
    emit({
        "passed_count": 0,
        "total_count": len(tests),
        "time_ms": 0.0,
        "memory_kb": 0.0,
        "error": f"Missing entry point {function_name!r}: {exc!r}",
        "failures": [],
        "largest_ms": 0.0,
        "largest_n": 0,
    })
    raise SystemExit(0)

passed = 0
timings = []
failures = []
first_error = None
tracemalloc.start()

for index, test in enumerate(tests):
    started = time.perf_counter_ns()
    try:
        value = target(*test["args"])
        elapsed_ms = (time.perf_counter_ns() - started) / 1_000_000.0
        timings.append((test.get("size", 0), elapsed_ms))
        got = canonical(value)
        if got == test["expected"]:
            passed += 1
        else:
            if len(failures) < 4:
                failures.append({
                    "label": test.get("label") or f"Test {index + 1}",
                    "expected": test["expected"],
                    "got": got,
                })
    except Exception as exc:
        elapsed_ms = (time.perf_counter_ns() - started) / 1_000_000.0
        timings.append((test.get("size", 0), elapsed_ms))
        if first_error is None:
            first_error = f"{type(exc).__name__}: {exc}"
        for skipped in range(index, len(tests)):
            if len(failures) < 4:
                failures.append({
                    "label": tests[skipped].get("label") or f"Test {skipped + 1}",
                    "expected": tests[skipped]["expected"],
                    "got": "<exception>",
                })
        break

_, peak_bytes = tracemalloc.get_traced_memory()
tracemalloc.stop()

largest = max(timings, key=lambda item: item[0]) if timings else (0, 0.0)
emit({
    "passed_count": passed,
    "total_count": len(tests),
    "time_ms": round(sum(item[1] for item in timings), 4),
    "memory_kb": round(peak_bytes / 1024.0, 2),
    "error": first_error,
    "failures": failures,
    "largest_ms": round(largest[1], 4),
    "largest_n": largest[0],
})
'''


def _test_size(test: TestCase) -> int:
    size = 0
    for arg in test.args:
        if isinstance(arg, (list, tuple, str)):
            size = max(size, len(arg))
    return size


def _serialize_tests(problem: Problem, tests: list[TestCase]) -> str:
    lines: list[str] = [str(len(tests))]
    for test in tests:
        lines.append(test.expected)
        for spec, value in zip(problem.arg_specs, test.args):
            if spec == "int":
                lines.append(str(int(value)))
            elif spec == "str":
                lines.append(str(len(value)))
                lines.append(str(value))
            elif spec == "int_list":
                lines.append(str(len(value)))
                lines.append(" ".join(str(int(item)) for item in value))
    return "\n".join(lines) + "\n"


def _result(
    *,
    passed: int,
    total: int,
    time_ms: float,
    memory_kb: float,
    error: str | None,
    failures: list[dict[str, Any]] | None = None,
    timed_out: bool = False,
    largest_ms: float = 0.0,
    largest_n: int = 0,
    language: str = "python",
) -> dict[str, Any]:
    return {
        "all_passed": total > 0 and passed == total and not timed_out,
        "passed_count": passed,
        "total_count": total,
        "time_ms": round(max(0.0, time_ms), 4),
        "memory_kb": round(max(0.0, memory_kb), 2),
        "error": error,
        "failures": failures or [],
        "timed_out": timed_out,
        "largest_ms": round(max(0.0, largest_ms), 4),
        "largest_n": largest_n,
        "language": language,
    }


def _check_python_safety(code: str) -> str | None:
    import ast

    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        return f"SyntaxError: {exc}"

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split(".")[0] in _PYTHON_DENIED_IMPORTS:
                    return f"SecurityError: module '{alias.name}' is not allowed"
        elif isinstance(node, ast.ImportFrom):
            root = (node.module or "").split(".")[0]
            if root in _PYTHON_DENIED_IMPORTS:
                return f"SecurityError: module '{node.module}' is not allowed"
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in {"eval", "exec", "compile", "__import__", "open"}:
                return f"SecurityError: '{node.func.id}' is not allowed"
    return None


def _run_python(
    code: str,
    problem: Problem,
    tests: list[TestCase],
    timeout: float,
) -> dict[str, Any]:
    total = len(tests)
    safety_error = _check_python_safety(code)
    if safety_error:
        return _result(
            passed=0,
            total=total,
            time_ms=0.0,
            memory_kb=0.0,
            error=safety_error,
            language="python",
        )

    with tempfile.TemporaryDirectory(prefix="algo-battle-") as temp_dir:
        temp = Path(temp_dir)
        solution_path = temp / "solution.py"
        harness_path = temp / "harness.py"
        tests_path = temp / "tests.json"

        solution_path.write_text(code, encoding="utf-8")
        harness_path.write_text(textwrap.dedent(_PYTHON_HARNESS), encoding="utf-8")
        payload = [
            {
                "args": test.args,
                "expected": test.expected,
                "label": test.label,
                "size": _test_size(test),
            }
            for test in tests
        ]
        tests_path.write_text(json.dumps(payload), encoding="utf-8")

        env = {
            **os.environ,
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONHASHSEED": "0",
        }
        command = [
            sys.executable,
            str(harness_path),
            str(solution_path),
            str(tests_path),
            problem.normalizer,
            problem.function_name,
        ]

        try:
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=temp_dir,
                env=env,
            )
        except subprocess.TimeoutExpired:
            return _result(
                passed=0,
                total=total,
                time_ms=timeout * 1000,
                memory_kb=0.0,
                error=(
                    f"TimeLimitExceeded: solution exceeded the "
                    f"{timeout:g}s sandbox limit."
                ),
                timed_out=True,
                largest_ms=timeout * 1000,
                largest_n=max((_test_size(t) for t in tests), default=0),
                language="python",
            )

    output_lines = [line for line in completed.stdout.splitlines() if line.strip()]
    parsed: dict[str, Any] | None = None
    for line in reversed(output_lines):
        try:
            candidate = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(candidate, dict) and "passed_count" in candidate:
            parsed = candidate
            break

    if parsed is None:
        stderr = completed.stderr.strip()
        message = stderr.splitlines()[-1] if stderr else "Solution produced no result."
        return _result(
            passed=0,
            total=total,
            time_ms=0.0,
            memory_kb=0.0,
            error=f"RuntimeError: {message}",
            language="python",
        )

    error = parsed.get("error")
    if completed.returncode != 0 and not error:
        error = completed.stderr.strip() or f"Process exited with code {completed.returncode}"

    return _result(
        passed=int(parsed.get("passed_count", 0)),
        total=int(parsed.get("total_count", total)),
        time_ms=float(parsed.get("time_ms", 0.0)),
        memory_kb=float(parsed.get("memory_kb", 0.0)),
        error=error,
        failures=parsed.get("failures") or [],
        largest_ms=float(parsed.get("largest_ms", 0.0)),
        largest_n=int(parsed.get("largest_n", 0)),
        language="python",
    )


def _cpp_read_arg(spec: str, index: int) -> tuple[str, str]:
    name = f"arg{index}"
    if spec == "int":
        return (
            f"    int {name};\n"
            f"    cin >> {name};\n"
            "    cin.ignore(numeric_limits<streamsize>::max(), '\\n');\n",
            name,
        )
    if spec == "str":
        return (
            f"    int len{index};\n"
            f"    cin >> len{index};\n"
            "    cin.ignore(numeric_limits<streamsize>::max(), '\\n');\n"
            f"    string {name};\n"
            f"    getline(cin, {name});\n",
            name,
        )
    return (
        f"    int len{index};\n"
        f"    cin >> len{index};\n"
        f"    vector<int> {name}(len{index});\n"
        f"    for (int i = 0; i < len{index}; ++i) cin >> {name}[i];\n"
        "    cin.ignore(numeric_limits<streamsize>::max(), '\\n');\n",
        name,
    )


def _cpp_canonical(spec: str, result_name: str = "result") -> str:
    if spec == "int":
        return f"    string got = to_string({result_name});\n"
    if spec == "bool":
        return f'    string got = {result_name} ? "true" : "false";\n'
    if spec == "int_list":
        return (
            f"    sort({result_name}.begin(), {result_name}.end());\n"
            "    string got;\n"
            f"    for (size_t i = 0; i < {result_name}.size(); ++i) {{\n"
            '        if (i) got += ",";\n'
            f"        got += to_string({result_name}[i]);\n"
            "    }\n"
        )
    return f"    string got = {result_name};\n"


def _cpp_return_type(spec: str) -> str:
    return {
        "int": "int",
        "bool": "bool",
        "int_list": "vector<int>",
        "str_list": "vector<string>",
    }[spec]


def _build_cpp_source(problem: Problem, tests: list[TestCase]) -> str:
    reads: list[str] = []
    args: list[str] = []
    for index, spec in enumerate(problem.arg_specs):
        read_code, name = _cpp_read_arg(spec, index)
        reads.append(read_code)
        args.append(name)

    expected_literals = ", ".join(
        json.dumps(test.expected) for test in tests
    )
    sizes = ", ".join(str(_test_size(test)) for test in tests)

    return (
        "#include <bits/stdc++.h>\n"
        "using namespace std;\n"
        "#define main algo_battle_driver_main\n"
        "#include \"solution.cpp\"\n"
        "#undef main\n\n"
        "int main() {\n"
        "    ios::sync_with_stdio(false);\n"
        "    cin.tie(nullptr);\n"
        "    int T;\n"
        "    if (!(cin >> T)) return 0;\n"
        "    cin.ignore(numeric_limits<streamsize>::max(), '\\n');\n"
        f"    vector<string> expected = {{{expected_literals}}};\n"
        f"    vector<int> sizes = {{{sizes}}};\n"
        "    Solution sol;\n"
        "    int passed = 0;\n"
        "    for (int ti = 0; ti < T; ++ti) {\n"
        "        string expected_line;\n"
        "        getline(cin, expected_line);\n"
        + textwrap.indent("".join(reads), "        ")
        + f"        auto start = chrono::steady_clock::now();\n"
        f"        {_cpp_return_type(problem.return_spec)} result = sol."
        + f"{problem.function_name}({', '.join(args)});\n"
        "        auto end = chrono::steady_clock::now();\n"
        "        long long ns = chrono::duration_cast<chrono::nanoseconds>(end - start).count();\n"
        + _cpp_canonical(problem.return_spec)
        + "        if (got == expected_line) {\n"
        "            ++passed;\n"
        '            cout << "PASS\\t" << ns << "\\n";\n'
        "        } else {\n"
        '            cout << "FAIL\\t" << ns << "\\t" << expected_line << "\\t" << got << "\\n";\n'
        "        }\n"
        "    }\n"
        "    return 0;\n"
        "}\n"
    )


def _java_read_arg(spec: str, index: int) -> tuple[str, str]:
    name = f"arg{index}"
    if spec == "int":
        return (f"        int {name} = Integer.parseInt(br.readLine().trim());\n", name)
    if spec == "str":
        return (
            f"        int len{index} = Integer.parseInt(br.readLine().trim());\n"
            f"        String {name} = br.readLine();\n"
            f"        if ({name} == null) {name} = \"\";\n",
            name,
        )
    return (
        f"        int len{index} = Integer.parseInt(br.readLine().trim());\n"
        f"        int[] {name} = new int[len{index}];\n"
        f"        if (len{index} > 0) {{\n"
        "            String[] parts = br.readLine().trim().split(\" \");\n"
        f"            for (int i = 0; i < len{index}; i++) {name}[i] = Integer.parseInt(parts[i]);\n"
        "        } else {\n"
        "            br.readLine();\n"
        "        }\n",
        name,
    )


def _java_return_type(spec: str) -> str:
    return {
        "int": "int",
        "bool": "boolean",
        "int_list": "int[]",
        "str_list": "java.util.List<String>",
    }[spec]


def _java_canonical(spec: str) -> str:
    if spec == "int":
        return "        String got = Integer.toString(result);\n"
    if spec == "bool":
        return '        String got = result ? "true" : "false";\n'
    if spec == "int_list":
        return (
            "        int[] sorted = result.clone();\n"
            "        java.util.Arrays.sort(sorted);\n"
            "        StringBuilder builder = new StringBuilder();\n"
            "        for (int i = 0; i < sorted.length; i++) {\n"
            '            if (i > 0) builder.append(",");\n'
            "            builder.append(sorted[i]);\n"
            "        }\n"
            "        String got = builder.toString();\n"
        )
    return "        String got = String.valueOf(result);\n"


def _build_java_source(problem: Problem, tests: list[TestCase]) -> str:
    reads: list[str] = []
    args: list[str] = []
    for index, spec in enumerate(problem.arg_specs):
        read_code, name = _java_read_arg(spec, index)
        reads.append(read_code)
        args.append(name)

    expected_literals = ", ".join(json.dumps(test.expected) for test in tests)
    sizes = ", ".join(str(_test_size(test)) for test in tests)

    return (
        "import java.io.*;\n"
        "import java.util.*;\n\n"
        + _JAVA_SENTINEL
        + "\n\n"
        + "public class Main {\n"
        "    public static void main(String[] args) throws Exception {\n"
        "        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n"
        "        int T = Integer.parseInt(br.readLine().trim());\n"
        f"        String[] expected = new String[]{{{expected_literals}}};\n"
        f"        int[] sizes = new int[]{{{sizes}}};\n"
        "        Solution sol = new Solution();\n"
        "        StringBuilder output = new StringBuilder();\n"
        "        for (int ti = 0; ti < T; ti++) {\n"
        "            String expectedLine = br.readLine();\n"
        + "".join(reads)
        + "            long start = System.nanoTime();\n"
        + f"            {_java_return_type(problem.return_spec)} result = sol."
        + f"{problem.function_name}({', '.join(args)});\n"
        "            long ns = System.nanoTime() - start;\n"
        + _java_canonical(problem.return_spec)
        + "            if (got.equals(expectedLine)) {\n"
        '                output.append("PASS\\t").append(ns).append("\\n");\n'
        "            } else {\n"
        '                output.append("FAIL\\t").append(ns).append("\\t")\n'
        '                      .append(expectedLine).append("\\t").append(got).append("\\n");\n'
        "            }\n"
        "        }\n"
        "        System.out.print(output.toString());\n"
        "    }\n"
        "}\n"
    )


_JAVA_SENTINEL = "__ALGO_BATTLE_SOLUTION__"


def _parse_driver_output(
    stdout: str,
    tests: list[TestCase],
    language: str,
    total: int,
) -> tuple[int, float, list[dict[str, Any]], float, int]:
    passed = 0
    elapsed_ms = 0.0
    failures: list[dict[str, Any]] = []
    timings: list[tuple[int, float]] = []

    for index, line in enumerate(stdout.splitlines()):
        fields = line.split("\t")
        if len(fields) < 2 or fields[0] not in {"PASS", "FAIL"}:
            continue
        try:
            ns = int(fields[1])
        except ValueError:
            continue
        ms = ns / 1_000_000.0
        elapsed_ms += ms
        size = _test_size(tests[index]) if index < len(tests) else 0
        timings.append((size, ms))
        if fields[0] == "PASS":
            passed += 1
        elif len(failures) < MAX_FAILURE_DETAILS:
            failures.append(
                {
                    "label": tests[index].label or f"Test {index + 1}"
                    if index < len(tests)
                    else f"Test {index + 1}",
                    "expected": fields[2] if len(fields) > 2 else "",
                    "got": fields[3] if len(fields) > 3 else "",
                }
            )

    largest = max(timings, key=lambda item: item[0]) if timings else (0, 0.0)
    return passed, elapsed_ms, failures, largest[1], largest[0]


def _run_compiled(
    code: str,
    language: str,
    problem: Problem,
    tests: list[TestCase],
    timeout: float,
) -> dict[str, Any]:
    total = len(tests)
    input_data = _serialize_tests(problem, tests)

    with tempfile.TemporaryDirectory(prefix="algo-battle-") as temp_dir:
        temp = Path(temp_dir)

        if language == "cpp":
            (temp / "solution.cpp").write_text(code, encoding="utf-8")
            (temp / "main.cpp").write_text(
                _build_cpp_source(problem, tests), encoding="utf-8"
            )
            compiler = shutil.which("g++")
            if compiler is None:
                return _result(
                    passed=0,
                    total=total,
                    time_ms=0.0,
                    memory_kb=0.0,
                    error="CompilationError: g++ is not installed on the server.",
                    language=language,
                )
            try:
                compile_result = subprocess.run(
                    [
                        compiler,
                        "-O2",
                        "-std=c++17",
                        "-pipe",
                        "main.cpp",
                        "-o",
                        "main",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=COMPILE_TIMEOUT_SECONDS,
                    cwd=temp_dir,
                )
            except subprocess.TimeoutExpired:
                return _result(
                    passed=0,
                    total=total,
                    time_ms=0.0,
                    memory_kb=0.0,
                    error="CompilationError: compilation timed out.",
                    language=language,
                )
            if compile_result.returncode != 0:
                return _result(
                    passed=0,
                    total=total,
                    time_ms=0.0,
                    memory_kb=0.0,
                    error="CompilationError:\n" + compile_result.stderr.strip()[:4000],
                    language=language,
                )
            command = [str(temp / "main")]
        else:
            (temp / "Main.java").write_text(
                _build_java_source(problem, tests).replace(
                    _JAVA_SENTINEL, code
                ),
                encoding="utf-8",
            )
            compiler = shutil.which("javac")
            if compiler is None:
                return _result(
                    passed=0,
                    total=total,
                    time_ms=0.0,
                    memory_kb=0.0,
                    error="CompilationError: javac is not installed on the server.",
                    language=language,
                )
            try:
                compile_result = subprocess.run(
                    [compiler, "-encoding", "UTF-8", "Main.java"],
                    capture_output=True,
                    text=True,
                    timeout=COMPILE_TIMEOUT_SECONDS,
                    cwd=temp_dir,
                )
            except subprocess.TimeoutExpired:
                return _result(
                    passed=0,
                    total=total,
                    time_ms=0.0,
                    memory_kb=0.0,
                    error="CompilationError: compilation timed out.",
                    language=language,
                )
            if compile_result.returncode != 0:
                return _result(
                    passed=0,
                    total=total,
                    time_ms=0.0,
                    memory_kb=0.0,
                    error="CompilationError:\n" + compile_result.stderr.strip()[:4000],
                    language=language,
                )
            command = [shutil.which("java") or "java", "-cp", str(temp), "Main"]

        try:
            completed = subprocess.run(
                command,
                input=input_data,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=temp_dir,
            )
        except subprocess.TimeoutExpired:
            return _result(
                passed=0,
                total=total,
                time_ms=timeout * 1000,
                memory_kb=0.0,
                error=(
                    f"TimeLimitExceeded: solution exceeded the "
                    f"{timeout:g}s sandbox limit."
                ),
                timed_out=True,
                largest_ms=timeout * 1000,
                largest_n=max((_test_size(t) for t in tests), default=0),
                language=language,
            )

    passed, elapsed_ms, failures, largest_ms, largest_n = _parse_driver_output(
        completed.stdout, tests, language, total
    )

    error = None
    if completed.returncode != 0:
        stderr = completed.stderr.strip()
        if stderr:
            error = "RuntimeError:\n" + stderr[-4000:]

    return _result(
        passed=passed,
        total=total,
        time_ms=elapsed_ms,
        memory_kb=0.0,
        error=error,
        failures=failures,
        largest_ms=largest_ms,
        largest_n=largest_n,
        language=language,
    )


def run_submission_sync(
    code: str,
    language: str,
    problem: Problem,
    *,
    include_stress: bool = True,
    timeout: float = EXECUTION_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    """Run a submission synchronously. Intended to be called from a thread."""
    tests = problem.all_tests(include_stress=include_stress)
    if not code or not code.strip():
        return _result(
            passed=0,
            total=len(tests),
            time_ms=0.0,
            memory_kb=0.0,
            error="No code submitted.",
            language=language,
        )

    if language == "python":
        return _run_python(code, problem, tests, timeout)
    if language in {"cpp", "java"}:
        return _run_compiled(code, language, problem, tests, timeout)
    return _result(
        passed=0,
        total=len(tests),
        time_ms=0.0,
        memory_kb=0.0,
        error=f"Unsupported language: {language}",
        language=language,
    )


async def run_submission(
    code: str,
    language: str,
    problem: Problem,
    *,
    include_stress: bool = True,
    timeout: float = EXECUTION_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    return await asyncio.to_thread(
        run_submission_sync,
        code,
        language,
        problem,
        include_stress=include_stress,
        timeout=timeout,
    )


def estimate_complexity(result: dict[str, Any]) -> str:
    """A pragmatic Big-O estimate from the largest stress measurement."""
    if not result.get("all_passed"):
        return "—"
    largest_n = int(result.get("largest_n") or 0)
    largest_ms = float(result.get("largest_ms") or 0.0)
    if largest_n <= 0:
        return "—"

    # Normalise to a 100k-element reference so the tiers are comparable.
    scale = 100_000 / max(largest_n, 1)
    adjusted = largest_ms * scale

    language = str(result.get("language") or "python")
    if language == "python":
        linear, linearithmic, quadratic = 160.0, 700.0, 3_000.0
    elif language == "java":
        linear, linearithmic, quadratic = 100.0, 300.0, 1_500.0
    else:
        linear, linearithmic, quadratic = 60.0, 200.0, 1_200.0

    if adjusted <= linear:
        return "O(N)"
    if adjusted <= linearithmic:
        return "O(N log N)"
    if adjusted <= quadratic:
        return "O(N²)"
    return "O(N²) or worse"


__all__ = [
    "EXECUTION_TIMEOUT_SECONDS",
    "run_submission",
    "run_submission_sync",
    "estimate_complexity",
]
