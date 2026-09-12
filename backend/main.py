"""
Mars Rover — FastAPI Backend
============================

Endpoints
---------
POST /run
    Body:  { "code": "<player python code>", "language": "python" }
    Returns: { "actions": [...], "error": null | "..." }

GET /health
    Returns: { "status": "ok" }

Architecture
------------
1. Player submits code via the frontend IDE.
2. Backend prepends the Rover SDK shim so `rover` is available in scope.
3. Code runs in a sandboxed subprocess with:
   - 5-second wall-clock timeout
   - stdout captured → parsed as JSON action stream
   - stderr captured → returned as error detail
4. The JSON action list is returned to the frontend for playback.

Extensibility
-------------
- Add new languages by creating a runner in `runners/<language>.py`
  that follows the same `run(code) -> RunResult` interface.
- The Rover SDK contract (print JSON to stdout) is language-agnostic.
"""

import ast
import json
import os
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path
from typing import Any, Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── App setup ──────────────────────────────────────────────────────────────

app = FastAPI(title="Mars Rover API", version="1.0.0")

cors_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if "*" not in cors_origins else ["*"],
    allow_credentials=False if "*" in cors_origins else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Absolute path to the rover_sdk package directory
SDK_DIR = Path(__file__).parent / "rover_sdk"

# ── Schema ─────────────────────────────────────────────────────────────────

SUPPORTED_LANGUAGES = {"python", "cpp", "java"}

# Forbidden AST node types to block dangerous code
BLOCKED_NODES = {
    ast.Import,
    ast.ImportFrom,
}

# Allowed __builtins__ to whitelist (all others are stripped)
SAFE_BUILTINS = {
    "print", "range", "len", "int", "float", "str", "bool",
    "list", "dict", "tuple", "set", "min", "max", "abs",
    "round", "sorted", "enumerate", "zip", "map", "filter",
    "isinstance", "type", "repr", "ValueError", "TypeError",
    "Exception", "True", "False", "None",
}

MAX_ACTIONS = 500       # prevent absurdly long action streams
TIMEOUT_SECONDS = 5     # wall-clock limit per run


class RunRequest(BaseModel):
    code: str
    language: Literal["python", "cpp", "java"] = "python"


class RunResponse(BaseModel):
    actions: list[dict[str, Any]]
    error: str | None = None


# ── Safety checks ──────────────────────────────────────────────────────────

def _check_ast_safety(code: str) -> str | None:
    """
    Parse the player's code and reject any import statements.
    Returns an error message string if unsafe, else None.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        return f"SyntaxError: {exc}"

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            return (
                "ImportError: import statements are not allowed. "
                "Use the built-in `rover` object to interact with the game."
            )
    return None


# ── Python runner ──────────────────────────────────────────────────────────

def _build_shim() -> str:
    """
    Build the SDK shim code that is prepended to player code.
    The shim imports the Rover class and creates a `rover` singleton.
    """
    return textwrap.dedent(
        """
        import sys, os
        sys.path.insert(0, os.environ["ROVER_SDK_PATH"])
        from rover import Rover
        rover = Rover()
        # ── player code below ──
        """
    ).strip()


def _run_python(code: str) -> RunResponse:
    """Execute player Python code safely and return the action stream."""

    safety_err = _check_ast_safety(code)
    if safety_err:
        return RunResponse(actions=[], error=safety_err)

    shim = _build_shim()
    full_code = shim + "\n" + code

    # Write to a temp file so we can run it cleanly
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(full_code)
        tmp_path = tmp.name

    env = {
        **os.environ,
        "ROVER_SDK_PATH": str(SDK_DIR),
        "PYTHONDONTWRITEBYTECODE": "1",
    }

    try:
        result = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            env=env,
        )
    except subprocess.TimeoutExpired:
        return RunResponse(
            actions=[],
            error=f"TimeoutError: Code exceeded the {TIMEOUT_SECONDS}s execution limit.",
        )
    finally:
        os.unlink(tmp_path)

    # Parse stdout lines → action objects
    actions: list[dict] = []
    parse_errors: list[str] = []

    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
            actions.append(obj)
        except json.JSONDecodeError:
            parse_errors.append(f"Non-JSON output: {line!r}")

    if len(actions) > MAX_ACTIONS:
        actions = actions[:MAX_ACTIONS]
        parse_errors.append(
            f"Warning: action stream truncated to {MAX_ACTIONS} actions."
        )

    error: str | None = None
    if result.returncode != 0 and result.stderr:
        # Strip the temp file path from traceback for cleaner display
        stderr = result.stderr.replace(tmp_path, "<player_code>")
        error = stderr.strip()
    elif parse_errors:
        error = "\n".join(parse_errors)

    return RunResponse(actions=actions, error=error)


def _run_cpp(code: str) -> RunResponse:
    shim = '#define DEFINE_ROVER\n#include "rover.hpp"\n'
    full_code = shim + "\n" + code

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)
        source_file = temp_dir_path / "main.cpp"
        source_file.write_text(full_code, encoding="utf-8")
        
        executable = temp_dir_path / ("main.exe" if os.name == "nt" else "main")
        
        compile_res = subprocess.run(
            ["g++", str(source_file), "-I", str(SDK_DIR), "-o", str(executable)],
            capture_output=True,
            text=True
        )
        if compile_res.returncode != 0:
            return RunResponse(actions=[], error=f"Compilation Error:\n{compile_res.stderr.strip()}")
            
        try:
            result = subprocess.run(
                [str(executable)],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            return RunResponse(actions=[], error=f"TimeoutError: Code exceeded the {TIMEOUT_SECONDS}s execution limit.")

    actions = []
    parse_errors = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            actions.append(json.loads(line))
        except json.JSONDecodeError:
            parse_errors.append(f"Non-JSON output: {line!r}")

    if len(actions) > MAX_ACTIONS:
        actions = actions[:MAX_ACTIONS]
        parse_errors.append(f"Warning: action stream truncated to {MAX_ACTIONS} actions.")

    error = None
    if result.returncode != 0 and result.stderr:
        error = result.stderr.strip()
    elif parse_errors:
        error = "\n".join(parse_errors)

    return RunResponse(actions=actions, error=error)

def _run_java(code: str) -> RunResponse:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)
        source_file = temp_dir_path / "Main.java"
        source_file.write_text(code, encoding="utf-8")
        
        compile_res = subprocess.run(
            ["javac", "-sourcepath", str(SDK_DIR), "-d", str(temp_dir_path), str(source_file)],
            capture_output=True,
            text=True
        )
        if compile_res.returncode != 0:
            return RunResponse(actions=[], error=f"Compilation Error:\n{compile_res.stderr.strip()}")
            
        try:
            result = subprocess.run(
                ["java", "-cp", str(temp_dir_path), "Main"],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            return RunResponse(actions=[], error=f"TimeoutError: Code exceeded the {TIMEOUT_SECONDS}s execution limit.")

    actions = []
    parse_errors = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            actions.append(json.loads(line))
        except json.JSONDecodeError:
            parse_errors.append(f"Non-JSON output: {line!r}")

    if len(actions) > MAX_ACTIONS:
        actions = actions[:MAX_ACTIONS]
        parse_errors.append(f"Warning: action stream truncated to {MAX_ACTIONS} actions.")

    error = None
    if result.returncode != 0 and result.stderr:
        error = result.stderr.strip()
    elif parse_errors:
        error = "\n".join(parse_errors)

    return RunResponse(actions=actions, error=error)


# ── Language router ────────────────────────────────────────────────────────
# To add a new language: add an entry here pointing to a runner function
# that accepts a `code: str` and returns `RunResponse`.

LANGUAGE_RUNNERS = {
    "python": _run_python,
    "cpp": _run_cpp,
    "java": _run_java,
}

# ── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/")
async def root() -> dict:
    return {
        "message": "Mars Rover API is running!",
        "status": "online",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "run": "POST /run",
        },
    }


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "supported_languages": list(LANGUAGE_RUNNERS.keys())}


@app.post("/run", response_model=RunResponse)
async def run_code(request: RunRequest) -> RunResponse:
    if request.language not in LANGUAGE_RUNNERS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported language '{request.language}'. "
                f"Supported: {', '.join(LANGUAGE_RUNNERS.keys())}"
            ),
        )
    runner = LANGUAGE_RUNNERS[request.language]
    return runner(request.code)
