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
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import subprocess
import sys
import tempfile
import textwrap
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse
from typing import Any, Literal
import jwt
import psycopg2
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel, field_validator

# Load local env files when running the backend outside Render.
for _env_file in (
    Path(__file__).resolve().parent / ".env",
    Path(__file__).resolve().parent.parent / "frontend" / ".env",
):
    if _env_file.exists():
        load_dotenv(_env_file)

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

# ── PostgreSQL configuration ─────────────────────────────────────────────
# Prefer the individual DB_* params when they are set, then fall back to
# DATABASE_URL so only the configured fields are used.
def _build_conn_params() -> dict:
    db_host = os.getenv("DB_HOST", "").strip()
    if db_host:
        return {
            "host": db_host,
            "port": int(os.getenv("DB_PORT", "5432")),
            "dbname": os.getenv("DB_NAME", "postgres"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASSWORD", ""),
            "sslmode": os.getenv("DB_SSLMODE", "require"),
        }

    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        parsed = urlparse(database_url)
        if parsed.scheme in {"postgres", "postgresql"} and parsed.hostname:
            return {
                "host": parsed.hostname,
                "port": parsed.port or 5432,
                "dbname": parsed.path.lstrip("/") or "postgres",
                "user": unquote(parsed.username or "postgres"),
                "password": unquote(parsed.password or ""),
                "sslmode": "require",
            }

    return {
        "host": "localhost",
        "port": 5432,
        "dbname": "postgres",
        "user": "postgres",
        "password": "",
        "sslmode": "prefer",
    }


conn_params = _build_conn_params()


# ── Password hashing ───────────────────────────────────────────────────────

PBKDF2_ITERATIONS = 390_000


def _hash_password(password: str) -> str:
    """Hash a password with PBKDF2-HMAC-SHA256 and a random salt."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return "pbkdf2_sha256${}${}${}".format(
        PBKDF2_ITERATIONS,
        base64.urlsafe_b64encode(salt).decode("ascii"),
        base64.urlsafe_b64encode(digest).decode("ascii"),
    )


def _verify_password(password: str, encoded: str | None) -> bool:
    """Check a password against a stored PBKDF2 hash."""
    if not encoded:
        return False
    try:
        algorithm, iterations, salt_b64, digest_b64 = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_b64.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_b64.encode("ascii"))
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, int(iterations)
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


# ── JWT configuration ──────────────────────────────────────────────────────

JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
if not JWT_SECRET:
    JWT_SECRET = secrets.token_urlsafe(48)
    print("Warning: JWT_SECRET is not set; using an ephemeral secret.")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))


def _create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _ensure_users_table() -> None:
    """Create the users table and migrate any legacy plaintext passwords."""
    try:
        conn = psycopg2.connect(**conn_params)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id BIGSERIAL PRIMARY KEY,
                        username TEXT NOT NULL,
                        password_hash TEXT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
                cur.execute(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT"
                )
                cur.execute(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at "
                    "TIMESTAMPTZ NOT NULL DEFAULT NOW()"
                )
                cur.execute(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'users'"
                )
                columns = {row[0] for row in cur.fetchall()}
                if "password" in columns:
                    cur.execute(
                        "SELECT id, password FROM users WHERE password_hash IS NULL"
                    )
                    for user_id, plain_password in cur.fetchall():
                        if plain_password is not None:
                            cur.execute(
                                "UPDATE users SET password_hash = %s WHERE id = %s",
                                (_hash_password(plain_password), user_id),
                            )
                    cur.execute("ALTER TABLE users DROP COLUMN password")
                cur.execute(
                    "ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL"
                )
                cur.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key "
                    "ON users (LOWER(username))"
                )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        print(f"Warning: could not ensure users table: {exc}")


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
        
        try:
            compile_res = subprocess.run(
                ["g++", str(source_file), "-I", str(SDK_DIR), "-o", str(executable)],
                capture_output=True,
                text=True
            )
        except FileNotFoundError:
            return RunResponse(
                actions=[],
                error="C++ toolchain unavailable: the server could not find `g++`.",
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
        except OSError as exc:
            return RunResponse(actions=[], error=f"Execution Error: {exc}")

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
        
        try:
            compile_res = subprocess.run(
                ["javac", "-sourcepath", str(SDK_DIR), "-d", str(temp_dir_path), str(source_file)],
                capture_output=True,
                text=True
            )
        except FileNotFoundError:
            return RunResponse(
                actions=[],
                error="Java toolchain unavailable: the server could not find `javac`. Install a JDK on the backend to run Java.",
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
        except FileNotFoundError:
            return RunResponse(
                actions=[],
                error="Java runtime unavailable: the server could not find `java`. Install a JDK on the backend to run Java.",
            )

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

# ── Database helpers ───────────────────────────────────────────────────────


def _get_db_connection():
    """Get a PostgreSQL database connection."""
    try:
        conn = psycopg2.connect(**conn_params)
        return conn
    except Exception as exc:
        print(f"Database connection error: {exc}")
        raise HTTPException(status_code=503, detail="Database unavailable")


def _get_user_by_id(user_id: int) -> dict | None:
    conn = _get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, username FROM users WHERE id = %s",
                (user_id,),
            )
            user = cur.fetchone()
            return dict(user) if user else None
    finally:
        conn.close()


def _insert_user_into_db(username: str, password_hash: str) -> dict:
    """Insert a new user, returning the public user fields."""
    conn = _get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO users (username, password_hash) "
                "VALUES (%s, %s) RETURNING id, username",
                (username, password_hash),
            )
            new_user = cur.fetchone()
        conn.commit()
        return dict(new_user)
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Username already taken")
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        print(f"Error creating user: {exc}")
        raise HTTPException(status_code=500, detail="Could not create account")
    finally:
        conn.close()


def _verify_user_credentials(username: str, password: str) -> dict | None:
    """Verify username/password against the database."""
    conn = _get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, username, password_hash FROM users "
                "WHERE LOWER(username) = LOWER(%s)",
                (username,),
            )
            user = cur.fetchone()
    finally:
        conn.close()

    if not user or not _verify_password(password, user["password_hash"]):
        return None
    return {"id": user["id"], "username": user["username"]}


# ── Auth models ────────────────────────────────────────────────────────────

USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_]{3,32}$")


def _normalize_username(value: str) -> str:
    username = value.strip().lower()
    if not USERNAME_PATTERN.match(username):
        raise ValueError(
            "Username must be 3-32 characters and use only letters, numbers, or underscores"
        )
    return username


class AuthSignup(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return _normalize_username(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(value) > 128:
            raise ValueError("Password must be at most 128 characters")
        return value


class AuthLogin(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return _normalize_username(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value or len(value) > 128:
            raise ValueError("Password must be between 1 and 128 characters")
        return value


class AuthUser(BaseModel):
    id: int
    username: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


bearer_scheme = HTTPBearer(auto_error=False)


def _get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    unauthorized = HTTPException(
        status_code=401,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized

    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
        user_id = int(payload.get("sub", ""))
    except (jwt.PyJWTError, TypeError, ValueError):
        raise unauthorized

    user = _get_user_by_id(user_id)
    if not user:
        raise unauthorized
    return user


# ── Auth endpoints ─────────────────────────────────────────────────────────
@app.post("/auth/signup", response_model=AuthResponse, status_code=201)
async def auth_signup(request: AuthSignup) -> AuthResponse:
    """Register a new user with username and password."""
    user = _insert_user_into_db(request.username, _hash_password(request.password))
    return AuthResponse(
        access_token=_create_access_token(user["id"]),
        user=AuthUser(**user),
    )


@app.post("/auth/login", response_model=AuthResponse)
async def auth_login(request: AuthLogin) -> AuthResponse:
    """Login with username and password."""
    user = _verify_user_credentials(request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AuthResponse(
        access_token=_create_access_token(user["id"]),
        user=AuthUser(**user),
    )


@app.get("/auth/me", response_model=AuthUser)
async def auth_me(current_user: dict = Depends(_get_current_user)) -> AuthUser:
    """Return the user for the current bearer token."""
    return AuthUser(**current_user)


# ── Endpoints ──────────────────────────────────────────────────────────────

@app.on_event("startup")
async def _startup() -> None:
    _ensure_users_table()


@app.get("/")
async def root() -> dict:
    return {
        "message": "Mars Rover API is running!",
        "status": "online",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "run": "POST /run",
            "auth": {
                "signup": "POST /auth/signup",
                "login": "POST /auth/login",
                "me": "GET /auth/me",
            },
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


# ── Language router ────────────────────────────────────────────────────────
# To add a new language: add an entry here pointing to a runner function
# that accepts a `code: str` and returns `RunResponse`.

LANGUAGE_RUNNERS = {
    "python": _run_python,
    "cpp": _run_cpp,
    "java": _run_java,
}