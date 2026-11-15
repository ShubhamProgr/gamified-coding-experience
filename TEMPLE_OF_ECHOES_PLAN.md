# 🏛️ Temple of Echoes — Full Implementation Plan
> Game 4: Teaching **Recursion** through Tower of Hanoi with a story-driven progression.

---

## Table of Contents
1. [Game Overview](#1-game-overview)
2. [Story & Level Design](#2-story--level-design)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Backend Implementation](#4-backend-implementation)
5. [Frontend Implementation](#5-frontend-implementation)
6. [Database Schema](#6-database-schema)
7. [API Contract](#7-api-contract)
8. [File Structure](#8-file-structure)
9. [Reuse from Existing Games](#9-reuse-from-existing-games)
10. [Implementation Phases](#10-implementation-phases)

---

## 1. Game Overview

| Attribute | Value |
|:---|:---|
| **Route** | `/temple` |
| **Core Topic** | Recursion (call stack, base case, recursive case, branching, $O(2^n)$) |
| **Mechanic** | Player writes a recursive `hanoi(n, source, aux, target)` function; backend executes it and emits a `MOVE_DISK` trace; frontend animates disks flying across stone spires |
| **Languages** | Python (primary), Java, C++ |
| **Levels** | 12 levels across 4 story chapters |
| **Save System** | PostgreSQL (logged in) or `localStorage` (guest) — identical pattern to WanderList |
| **Stars** | 3 per level: objective solved + optimal move count ($2^n - 1$) + no global variables |

---

## 2. Story & Level Design

### Characters
- **Kira** — The player character, a young archaeologist.
- **Echo** — The ancient spirit of the temple, acts as tutor and narrator.

### Chapter Breakdown

```
Chapter 1: The Entry Chamber   (Levels 1–3)   → Recursion basics & base case
Chapter 2: The Mirror Halls    (Levels 4–6)   → Call stack depth & aux peg
Chapter 3: The Cursed Vaults   (Levels 7–9)   → Branching recursion, complexity
Chapter 4: The Ascension       (Levels 10–12) → Debug broken recursion, 4-peg
```

### Level Config (`levelsConfig.ts` pattern)

```typescript
// Each level matches the shape of WANDER_LEVELS
type TempleLevel = {
  id:          number;
  chapter:     string;        // "Entry Chamber" | "Mirror Halls" | ...
  title:       string;        // "The First Stone"
  story:       string;        // Narrative shown before the level starts
  echoDialogue: string;       // Hint/flavour spoken by Echo after solving
  task:        string;        // "Move 1 disk from A to C."
  hint:        string;        // "If n == 1, make the single move directly."
  concept:     string;        // "Base Case" — displayed as a badge
  disks:       number;        // 1–6, determines puzzle size
  pegs:        3 | 4;         // 4 pegs unlock in Chapter 4
  starterCode: Record<"python" | "java" | "cpp", string>;
};
```

### Full Level Table

| # | Chapter | Title | Disks | Concept | Story Beat |
|---|---------|-------|-------|---------|------------|
| 1 | Entry Chamber | The First Stone | 1 | Base Case | *Kira steps into a dimly lit antechamber. One glowing disc sits on the left spire.* |
| 2 | Entry Chamber | Echoes of Two | 2 | First Recursive Call | *A second heavier disc materializes. "You cannot simply lift. You must think ahead," Echo warns.* |
| 3 | Entry Chamber | The Triad | 3 | Full Recursion | *The sealed door ahead requires all three discs realigned. The floor rumbles.* |
| 4 | Mirror Halls | The Deeper Chamber | 3 | Call Stack Visualized | *Kira descends a staircase — each step is a stack frame glowing on the wall.* |
| 5 | Mirror Halls | The Weight of History | 4 | Stack Depth & Time | *Four discs, ancient and heavy. Echo whispers: "15 moves. No more, no less."* |
| 6 | Mirror Halls | The Infinite Corridor | 3 | Infinite Loop Bug | *Kira finds a corrupted inscription — a recursion with no base case. The corridor loops forever. Fix it.* |
| 7 | Cursed Vaults | The Branching Path | 4 | Branching & $2^n - 1$ | *The mural shows $2^4 - 1 = 15$ ancient monk footprints. Kira counts each step.* |
| 8 | Cursed Vaults | The Phantom Peg | 5 | Return Values | *A ghost peg appears — the auxiliary rod. "Use it as your memory," Echo says.* |
| 9 | Cursed Vaults | The Cursed Mirror | 3 | Debugging Wrong Peg | *A twisted mirror version of the solution moves discs to the wrong peg. Spot the error.* |
| 10 | The Ascension | The Fourth Spire | 4 (4 pegs) | Frame-Stewart (4-peg) | *A hidden fourth spire rises from the floor, cracking the stone. Fewer moves now possible.* |
| 11 | The Ascension | The Grand Sequence | 5 | Optimality ($2^n - 1$) | *Every disc must move in the minimum number of steps or the ceiling collapses.* |
| 12 | The Ascension | The Final Echo | 6 | Synthesis | *Kira reaches the summit. All six discs, three spires. The temple holds its breath.* |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│                                                                 │
│  /temple/page.tsx                                               │
│  ├── TempleToolbar        (level selector, language, stars)     │
│  ├── StoryDialoguePanel   (chapter banner + Echo dialogue)      │
│  ├── SplitPane                                                  │
│  │   ├── LEFT: TempleEditor  (Monaco, starter code)             │
│  │   └── RIGHT: TempleCanvas                                    │
│  │       ├── HanoiSpireCanvas  (3 or 4 animated stone spires)   │
│  │       └── CallStackPanel    (live call stack visualization)  │
│  ├── PlaybackControls     (← step  ▶ play  step →  timeline)   │
│  └── TempleTerminal       (stdout + error display)              │
└───────────────────────┬─────────────────────────────────────────┘
                        │  POST /temple/run
                        │  GET/PUT /games/temple/save
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI)                        │
│                                                                 │
│  main.py                                                        │
│  ├── POST /temple/run   →  temple_sdk.runner.run_submission()   │
│  ├── GET  /games/temple/save                                    │
│  └── PUT  /games/temple/save                                    │
│                                                                 │
│  temple_sdk/                                                    │
│  ├── runner.py    — executes player code, builds trace          │
│  ├── hanoi.py     — Peg class, emit(), reference solver         │
│  ├── validator.py — AST safety checks (no os, no open, etc.)   │
│  └── __init__.py                                                │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
                  PostgreSQL
              table: temple_saves
```

---

## 4. Backend Implementation

### 4a. `backend/temple_sdk/hanoi.py`

The core SDK. Defines the `Peg` and `Disk` objects that emit a JSON trace every time a disk is moved — analogous to how `itinerary.py` emits `POINTER_READ / POINTER_WRITE` events.

```python
"""
Temple SDK: Peg and Disk objects that record every MOVE_DISK event.
Player's hanoi() function operates on these objects so every move
is captured in the trace automatically.
"""
from __future__ import annotations
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any

# ── Trace context (one per request, thread-safe via ContextVar) ──────────────
_events: ContextVar[list[dict[str, Any]] | None] = ContextVar("temple_events", default=None)
_move_count: ContextVar[int] = ContextVar("temple_moves", default=0)

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


# ── Domain objects ────────────────────────────────────────────────────────────

@dataclass
class Disk:
    size: int          # 1 = smallest (top), N = largest (bottom)
    peg_id: str        # "A", "B", or "C" (or "D" for 4-peg variant)

    def __repr__(self) -> str:
        return f"Disk(size={self.size})"


class Peg:
    """
    Represents a temple spire. Player calls move(disk, target_peg).
    Every move is validated and recorded as a MOVE_DISK trace event.
    """
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
                "Larger discs cannot sit on smaller ones — the temple collapses!"
            )
        self._stack.append(disk)
        disk.peg_id = self.peg_id

    def pop(self) -> Disk:
        if not self._stack:
            raise ValueError(f"Peg {self.peg_id} is empty. Cannot move a disc from an empty spire.")
        return self._stack.pop()


def move(disk_count: int, source: Peg, auxiliary: Peg, target: Peg) -> None:
    """
    Reference implementation — used only for validation.
    Player is NOT allowed to call this directly (AST-blocked).
    """
    if disk_count == 0:
        return
    move(disk_count - 1, source, target, auxiliary)
    disk = source.pop()
    _emit({
        "action": "MOVE_DISK",
        "disk_size": disk.size,
        "from_peg": source.peg_id,
        "to_peg": target.peg_id,
        "move_number": _move_count.get() + 1,
    })
    _move_count.set(_move_count.get() + 1)
    target.push(disk)
    move(disk_count - 1, auxiliary, source, target)


def build_pegs(n: int, peg_count: int = 3) -> dict[str, Peg]:
    """Create the initial temple state: n disks stacked on peg A."""
    source = Peg("A", [Disk(size=i, peg_id="A") for i in range(n, 0, -1)])
    pegs = {
        "A": source,
        "B": Peg("B"),
        "C": Peg("C"),
    }
    if peg_count == 4:
        pegs["D"] = Peg("D")
    return pegs


def snapshot_pegs(pegs: dict[str, Peg]) -> dict[str, list[int]]:
    """Serialisable state of all pegs for the INITIAL_STATE event."""
    return {pid: [d.size for d in peg._stack] for pid, peg in pegs.items()}
```

---

### 4b. `backend/temple_sdk/runner.py`

Executes player code in a sandboxed namespace (same `sys.settrace` guard pattern as `wander_sdk/runner.py`), collects the trace, scores it.

```python
"""Execution and scoring for Temple of Echoes (Hanoi recursion) submissions."""
from __future__ import annotations

import ast, builtins, io, sys, time
from contextlib import redirect_stdout
from dataclasses import dataclass
from typing import Any

from .hanoi import Peg, Disk, build_pegs, clear_trace, get_trace, get_move_count, snapshot_pegs
from .validator import validate_code, ValidationError

MAX_MOVES = 500          # hard cap; prevents infinite recursion on large n
MAX_INSTRUCTIONS = 50_000

class TooManyMovesError(RuntimeError): ...


@dataclass
class TempleRunResult:
    success:      bool
    stars_earned: int
    star_details: dict[str, bool]      # objective, optimal_moves, no_globals
    metrics:      dict[str, int]       # move_count, instruction_count, recursion_depth
    timeline:     list[dict[str, Any]] # INITIAL_STATE + MOVE_DISK* + CALL_FRAME* events
    stdout:       str
    error:        str | None

    def as_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


def _safe_builtins() -> dict[str, Any]:
    allowed = (
        "abs", "all", "any", "enumerate", "len", "max", "min",
        "range", "print", "isinstance", "int", "str", "bool",
    )
    return {name: getattr(builtins, name) for name in allowed}


def run_submission(code: str, level_id: int = 1, language: str = "python") -> TempleRunResult:
    if language in {"java", "cpp"}:
        return _run_compiled_submission(code, level_id, language)

    # Level config: how many disks, how many pegs, what's the optimal move count
    n_disks, n_pegs = _level_config(level_id)
    optimal_moves = (2 ** n_disks) - 1   # classic 3-peg optimum

    started = time.monotonic()
    timeline: list[dict[str, Any]] = []
    instruction_count = 0

    try:
        tree = validate_code(code)
        pegs = build_pegs(n_disks, n_pegs)
        timeline.append({"action": "INITIAL_STATE", "pegs": snapshot_pegs(pegs)})

        clear_trace()
        output = io.StringIO()

        # Expose Peg and Disk classes plus the initial pegs to the player
        namespace: dict[str, Any] = {
            "__builtins__": _safe_builtins(),
            "Peg": Peg,
            "Disk": Disk,
            **{pid: peg for pid, peg in pegs.items()},  # A, B, C (and D)
        }

        def guard(_frame: Any, event: str, _arg: Any) -> Any:
            nonlocal instruction_count
            if event == "line":
                instruction_count += 1
                if instruction_count > MAX_INSTRUCTIONS:
                    raise RecursionError(
                        "The temple trembles! Your recursion ran too deep or too long. "
                        "Check your base case."
                    )
                if time.monotonic() - started > 5:
                    raise TimeoutError("Execution exceeded 5 seconds. Check your base case.")
            return guard

        prev_trace = sys.gettrace()
        sys.settrace(guard)
        try:
            exec(compile(tree, "<temple>", "exec"), namespace)
            fn = _find_function(namespace)
            with redirect_stdout(output):
                # Player calls hanoi(n, A, B, C) using the exposed peg objects
                fn(n_disks, pegs["A"], pegs["B"], pegs["C"])
        finally:
            sys.settrace(prev_trace)

        raw_trace = get_trace()
        timeline.extend(raw_trace)
        move_count = get_move_count()

        # ── Scoring ─────────────────────────────────────────────────────────
        # 1. Objective: target peg C has all n disks in correct order
        objective = _validate_final_state(pegs, n_disks)
        # 2. Optimal: moved exactly 2^n - 1 times (or ≤ Frame-Stewart for 4-peg)
        is_optimal = move_count <= optimal_moves
        # 3. No globals: AST validator checks for global statements
        no_globals = True   # enforced during validate_code()

        stars = int(objective) + int(is_optimal) + int(no_globals)
        return TempleRunResult(
            success=objective,
            stars_earned=min(3, stars),
            star_details={"objective": objective, "optimal_moves": is_optimal, "no_globals": no_globals},
            metrics={"move_count": move_count, "instruction_count": instruction_count, "disk_count": n_disks},
            timeline=timeline,
            stdout=output.getvalue(),
            error=None,
        )

    except (ValidationError, RecursionError, TimeoutError, ValueError,
            TooManyMovesError, TypeError, NameError, AttributeError) as exc:
        raw_trace = get_trace()
        timeline.extend(raw_trace)
        return TempleRunResult(
            success=False, stars_earned=0,
            star_details={"objective": False, "optimal_moves": False, "no_globals": False},
            metrics={"move_count": get_move_count(), "instruction_count": instruction_count, "disk_count": n_disks},
            timeline=timeline,
            stdout="",
            error=str(exc),
        )


def _level_config(level_id: int) -> tuple[int, int]:
    """Returns (n_disks, n_pegs) for a given level."""
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
    raise ValidationError("Define a function named hanoi(n, source, aux, target) in your submission.")


def _validate_final_state(pegs: dict[str, Peg], n: int) -> bool:
    """All n disks must be on peg C in ascending order (size 1 on top)."""
    target = pegs.get("C")
    if target is None:
        return False
    sizes = [d.size for d in target._stack]
    return sizes == list(range(n, 0, -1))
```

---

### 4c. `backend/temple_sdk/validator.py`

AST safety checks — blocks `import`, `open`, `os`, `global` statements, and direct calls to the reference `move()` function.

```python
"""AST-based safety validator for Temple of Echoes submissions."""
import ast

FORBIDDEN_NAMES = {"os", "sys", "open", "exec", "eval", "compile", "__import__"}
FORBIDDEN_CALLS = {"move"}     # blocks calling the reference solver directly

class ValidationError(ValueError): ...


def validate_code(source: str) -> ast.Module:
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        raise ValidationError(f"Syntax error: {exc}") from exc

    for node in ast.walk(tree):
        # Block imports
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            raise ValidationError("Import statements are not allowed in the temple.")
        # Block global/nonlocal (3rd star criterion)
        if isinstance(node, (ast.Global, ast.Nonlocal)):
            raise ValidationError(
                "global / nonlocal statements are not allowed. "
                "True recursion lives in function parameters, not global state."
            )
        # Block forbidden names
        if isinstance(node, ast.Name) and node.id in FORBIDDEN_NAMES:
            raise ValidationError(f"'{node.id}' is not allowed in the temple.")
        # Block calling the reference move() directly
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id in FORBIDDEN_CALLS:
                raise ValidationError(
                    "You cannot call the built-in move() directly. "
                    "Implement your own hanoi() that uses peg.push() and peg.pop()."
                )

    return tree
```

---

### 4d. `backend/temple_sdk/__init__.py`

```python
from .runner import run_submission, TempleRunResult
from .hanoi import build_pegs, Peg, Disk
from .validator import ValidationError
```

---

### 4e. New routes in `backend/main.py`

Add these blocks alongside the existing WanderList routes:

```python
# ── Temple SDK import ─────────────────────────────────────────────────────
from temple_sdk.runner import run_submission as temple_run_submission

# ── Pydantic models ───────────────────────────────────────────────────────
class TempleRunRequest(BaseModel):
    code:     str = Field(..., min_length=1, max_length=20_000)
    level_id: int = Field(1, ge=1, le=12)
    language: Literal["python", "java", "cpp"] = "python"

class TempleSave(BaseModel):
    current_level:  int                    = 1
    unlocked_levels: int                   = 1
    stars_by_level: dict[str, int]         = {}
    code_by_level:  dict[str, str]         = {}

# ── Endpoints ─────────────────────────────────────────────────────────────
@app.post("/temple/run")
async def run_temple(request: TempleRunRequest) -> dict[str, Any]:
    """Run a Hanoi recursion submission and return its playback timeline."""
    result = await asyncio.to_thread(
        temple_run_submission, request.code, request.level_id, request.language
    )
    return result.as_dict()


@app.get("/games/temple/save", response_model=TempleSave)
async def get_temple_save(current_user: dict = Depends(_get_current_user)) -> TempleSave:
    save = await asyncio.to_thread(_get_temple_save, current_user["id"])
    return TempleSave(**(save or {}))


@app.put("/games/temple/save", response_model=TempleSave)
async def put_temple_save(
    save: TempleSave,
    current_user: dict = Depends(_get_current_user),
) -> TempleSave:
    saved = await asyncio.to_thread(_save_temple, current_user["id"], save)
    return TempleSave(**saved)
```

---

## 5. Frontend Implementation

### 5a. Level Config — `levelsConfig.ts`

```typescript
// frontend/components/Temple/config/levelsConfig.ts

export type TempleLanguage = "python" | "java" | "cpp";

export type TempleLevel = {
  id:            number;
  chapter:       "Entry Chamber" | "Mirror Halls" | "Cursed Vaults" | "The Ascension";
  title:         string;
  story:         string;         // shown in StoryDialoguePanel before play
  echoDialogue:  string;         // shown after solving (Echo speaks)
  task:          string;
  hint:          string;
  concept:       string;         // badge: "Base Case", "Call Stack", etc.
  disks:         number;
  pegs:          3 | 4;
  starterCodeByLanguage: Record<TempleLanguage, string>;
};

const pythonStarter = `def hanoi(n, source, aux, target):
    # Base case: if only one disk, move it directly
    if n == 1:
        disk = source.pop()
        target.push(disk)
        return
    # YOUR CODE HERE
    pass`;

export const TEMPLE_LEVELS: TempleLevel[] = [
  {
    id: 1, chapter: "Entry Chamber",
    title: "The First Stone",
    story: "Kira steps into a dimly lit antechamber. A single glowing disc rests on the left spire. The ancient spirit Echo whispers: \"Move it, child. This one is easy.\"",
    echoDialogue: "\"One step. That is all a base case ever asks of you.\"",
    task: "Move 1 disk from peg A to peg C.",
    hint: "When n == 1, simply pop from source and push to target.",
    concept: "Base Case",
    disks: 1, pegs: 3,
    starterCodeByLanguage: { python: pythonStarter, java: javaStarter, cpp: cppStarter },
  },
  // ... all 12 levels follow the same shape
];
```

---

### 5b. Page — `frontend/app/temple/page.tsx`

The root page. Mirrors `wanderlist/page.tsx` structure exactly:

```typescript
"use client";

// State mirrors WanderList page:
const [level, setLevel]       = useState(1);
const [unlocked, setUnlocked] = useState(1);
const [stars, setStars]       = useState<Record<string, number>>({});
const [codes, setCodes]       = useState<Record<string, string>>({});
const [language, setLanguage] = useState<TempleLanguage>("python");
const [showLevels, setShowLevels] = useState(false);
const [busy, setBusy]         = useState(false);
const [result, setResult]     = useState<TempleRunResult | null>(null);
const [showStory, setShowStory] = useState(true); // NEW: story dialogue gate

const playback = useTemplePlayback(result?.timeline.length ?? 0);
```

**Key differences from WanderList page:**
1. `showStory` gate renders `<StoryDialoguePanel>` before the game canvas loads for each new level.
2. The right pane renders `<HanoiSpireCanvas>` instead of `<CityMapCanvas>`.
3. A `<CallStackPanel>` sits below the canvas showing live stack frames.

---

### 5c. Canvas — `HanoiSpireCanvas.tsx`

The main visual. Renders SVG spires and disks, animating each `MOVE_DISK` event at the current playback index.

```typescript
// frontend/components/Temple/Canvas/HanoiSpireCanvas.tsx
"use client";

type MoveEvent = {
  action:      "MOVE_DISK";
  disk_size:   number;
  from_peg:    string;
  to_peg:      string;
  move_number: number;
};

type InitialState = {
  action: "INITIAL_STATE";
  pegs:   Record<string, number[]>;  // { A: [3,2,1], B: [], C: [] }
};

type TimelineEvent = InitialState | MoveEvent;
```

**Rendering logic:**
1. Start from `INITIAL_STATE` to build `pegState: Record<string, number[]>`.
2. Replay all `MOVE_DISK` events up to `playback.index`, updating `pegState`.
3. Draw 3 (or 4) stone spire SVGs with stacked colored rectangles for disks.
4. Disk width is proportional to `disk_size`; colour is a fixed palette (amber, rose, sky, emerald…).
5. When `playing`, animate the "flying" disk between pegs using a CSS `transform` transition keyed on `move_number`.

**Spire anatomy (SVG):**
```
       ║           ║           ║
   ════╬════       ║       ════╬════
   ═══════════     ║      ══════════
   ════════════════╬════════════════
        A          B          C
```

---

### 5d. Call Stack Panel — `CallStackPanel.tsx`

A side panel (or below the canvas) showing which recursive call is currently on the stack, using the `playback.index` to reconstruct the call stack from the timeline.

```typescript
// frontend/components/Temple/Canvas/CallStackPanel.tsx
"use client";

// Reconstructs active call frames from the timeline up to playback.index.
// MOVE_DISK events imply a stack depth: depth = pending moves ahead.
// A simpler approach: derive stack depth from move_number and total_moves.

function deriveCallStack(timeline: TimelineEvent[], upToIndex: number): StackFrame[] {
  // For each MOVE_DISK seen so far, calculate the implicit recursion depth
  // using: depth = floor(log2(total_moves - move_number + 1))
  // Returns an array of { n, source, aux, target } frames to display.
}
```

**Visual design:**
- Each frame is a glowing stone tablet card.
- Active frame glows amber; parent frames are dim.
- When a frame returns, it animates sliding off the top of the stack with a pop effect.

---

### 5e. Story Dialogue Panel — `StoryDialoguePanel.tsx`

```typescript
// frontend/components/Temple/StoryDialoguePanel.tsx
"use client";

type Props = {
  level:    TempleLevel;
  onStart:  () => void;    // dismiss and show the game canvas
};

export default function StoryDialoguePanel({ level, onStart }: Props) {
  return (
    <div className="temple-story-overlay">
      <div className="temple-chapter-badge">{level.chapter} · Level {level.id}</div>
      <div className="temple-concept-badge">{level.concept}</div>
      <h2>{level.title}</h2>
      <p className="temple-story-text">{level.story}</p>
      <div className="temple-task-box">
        <strong>Your task:</strong> {level.task}
      </div>
      <button onClick={onStart}>Enter the Temple ▶</button>
    </div>
  );
}
```

---

### 5f. Playback Hook — `useTemplePlayback.ts`

Identical to `useWanderPlayback.ts` — just a re-export with a different name. No logic changes needed.

```typescript
// frontend/components/Temple/Playback/useTemplePlayback.ts
export { useWanderPlayback as useTemplePlayback } from "@/components/WanderList/Playback/useWanderPlayback";
```

---

### 5g. API layer — additions to `frontend/lib/api.ts`

```typescript
// Add these types and functions to the existing api.ts

export type TempleRunResult = {
  success:      boolean;
  stars_earned: number;
  star_details: {
    objective:     boolean;
    optimal_moves: boolean;
    no_globals:    boolean;
  };
  metrics: {
    move_count:        number;
    instruction_count: number;
    disk_count:        number;
  };
  timeline: Array<Record<string, unknown>>;
  stdout:   string;
  error:    string | null;
};

export type TempleSave = {
  current_level:   number;
  unlocked_levels: number;
  stars_by_level:  Record<string, number>;
  code_by_level:   Record<string, string>;
};

export function runTemple(
  levelId: number,
  code: string,
  language: "python" | "java" | "cpp"
): Promise<TempleRunResult> {
  return request<TempleRunResult>("/temple/run", {
    method: "POST",
    body: { level_id: levelId, code, language },
  });
}

export function getTempleSave(token: string): Promise<TempleSave> {
  return request<TempleSave>("/games/temple/save", { token });
}

export function saveTemple(token: string, save: TempleSave): Promise<TempleSave> {
  return request<TempleSave>("/games/temple/save", {
    method: "PUT",
    token,
    body: save,
  });
}
```

---

## 6. Database Schema

Add this to `main.py`'s `_startup()` alongside the existing table initializers:

```python
def _ensure_temple_table() -> None:
    conn = psycopg2.connect(**conn_params)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS temple_saves (
                    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    current_level   INTEGER NOT NULL DEFAULT 1,
                    unlocked_levels INTEGER NOT NULL DEFAULT 1,
                    stars_by_level  JSONB   NOT NULL DEFAULT '{}',
                    code_by_level   JSONB   NOT NULL DEFAULT '{}',
                    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
        conn.commit()
    finally:
        conn.close()
```

Add `_ensure_temple_table()` call inside `_startup()`.

---

## 7. API Contract

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/temple/run` | None | `{code, level_id, language}` | `TempleRunResult` |
| `GET` | `/games/temple/save` | Bearer | — | `TempleSave` |
| `PUT` | `/games/temple/save` | Bearer | `TempleSave` | `TempleSave` |

### `POST /temple/run` — Timeline Event Types

```jsonc
// INITIAL_STATE (always first)
{ "action": "INITIAL_STATE", "pegs": { "A": [3,2,1], "B": [], "C": [] } }

// MOVE_DISK (one per disk movement)
{
  "action": "MOVE_DISK",
  "disk_size": 1,
  "from_peg": "A",
  "to_peg": "C",
  "move_number": 1
}
```

### Star Criteria

| Star | Condition | Display |
|------|-----------|---------|
| ⭐ Objective | All disks on peg C in correct order | "Sacred Discs Aligned" |
| ⭐ Optimal Moves | `move_count ≤ 2^n - 1` | "Ancient Efficiency" |
| ⭐ No Globals | No `global`/`nonlocal` statements | "Pure Recursion" |

---

## 8. File Structure

```
backend/
└── temple_sdk/
    ├── __init__.py        ← exports run_submission, TempleRunResult
    ├── hanoi.py           ← Peg, Disk, build_pegs(), emit trace
    ├── runner.py          ← run_submission(), _level_config(), scoring
    └── validator.py       ← AST safety checks

frontend/
├── app/
│   └── temple/
│       └── page.tsx       ← root page (mirrors wanderlist/page.tsx)
└── components/
    └── Temple/
        ├── config/
        │   └── levelsConfig.ts        ← TEMPLE_LEVELS array (12 levels)
        ├── Canvas/
        │   ├── HanoiSpireCanvas.tsx   ← SVG spires + animated disks
        │   └── CallStackPanel.tsx     ← live call stack visualizer
        ├── IDE/
        │   ├── TempleEditor.tsx       ← Monaco editor (fork of WanderEditor)
        │   └── TempleTerminal.tsx     ← stdout + error (fork of WanderTerminal)
        ├── Playback/
        │   └── useTemplePlayback.ts   ← re-exports useWanderPlayback
        ├── StoryDialoguePanel.tsx     ← chapter/story gate UI
        └── TempleToolbar.tsx          ← level picker, stars, language selector
```

---

## 9. Reuse from Existing Games

| Existing Asset | Reuse in Temple |
|:---------------|:----------------|
| `useWanderPlayback.ts` | Directly re-exported as `useTemplePlayback` — zero changes |
| `PlaybackControls.tsx` | Used as-is; just pass the temple playback hook |
| `WanderEditor.tsx` | Forked as `TempleEditor.tsx` — only the CSS class names and placeholder text change |
| `WanderTerminal.tsx` | Forked as `TempleTerminal.tsx` — identical logic |
| `WanderToolbar.tsx` | Forked as `TempleToolbar.tsx` — adds "Chapter" display |
| `wander_sdk/validator.py` | Forked as `temple_sdk/validator.py` — updated forbidden names |
| `main.py` Pydantic + auth pattern | Copy `TempleSave`, `TempleRunRequest`, `_get_current_user` unchanged |
| `lib/api.ts` `request()` helper | Re-used directly; just add `runTemple`, `getTempleSave`, `saveTemple` |
| `page.tsx` save/load pattern | `localStorage` guest fallback + token-based DB save — identical to WanderList |

> [!TIP]
> The `HanoiSpireCanvas` and `CallStackPanel` are the **only genuinely new components** to build from scratch. Everything else is a fork or direct reuse.

---

## 10. Implementation Phases

### Phase 1 — Backend Core (Day 1–2)
- [ ] Create `backend/temple_sdk/` directory
- [ ] Implement `hanoi.py` — `Peg`, `Disk`, `build_pegs()`, `clear_trace()`, `get_trace()`
- [ ] Implement `validator.py` — AST checks for `import`, `global`, forbidden names
- [ ] Implement `runner.py` — `run_submission()`, `_level_config()`, `_validate_final_state()`, scoring
- [ ] Add `temple_sdk/__init__.py`
- [ ] Add `POST /temple/run` endpoint to `main.py`
- [ ] Test with `backend/tests/test_temple_sdk.py` using reference solutions for all 12 levels
- [ ] Add `temple_saves` table migration in `_ensure_temple_table()`
- [ ] Add `GET/PUT /games/temple/save` endpoints

### Phase 2 — Level Design & Config (Day 2–3)
- [ ] Write full `TEMPLE_LEVELS` array in `levelsConfig.ts` (all 12 levels)
- [ ] Write Python, Java, and C++ starter code for each level
- [ ] Write Echo dialogue for each level (solve + hint text)
- [ ] Validate every level against the backend runner to confirm star logic is reachable

### Phase 3 — Frontend Canvas (Day 3–5)
- [ ] Build `HanoiSpireCanvas.tsx`:
  - SVG base with 3 stone spire pillars
  - `INITIAL_STATE` → initial disk layout
  - `MOVE_DISK` replay up to `playback.index`
  - Disk colour palette (one colour per disk size, consistent across all levels)
  - Smooth CSS transition for disk movement animation
- [ ] Build `CallStackPanel.tsx`:
  - Parse timeline to infer stack depth at each move
  - Render glowing stone tablet cards for each active frame
  - Animate push/pop transitions
- [ ] Add 4-peg variant support in both canvas and runner

### Phase 4 — Frontend Shell (Day 5–6)
- [ ] Fork `WanderEditor` → `TempleEditor`
- [ ] Fork `WanderTerminal` → `TempleTerminal`
- [ ] Fork `WanderToolbar` → `TempleToolbar` (add Chapter badge, Echo portrait)
- [ ] Re-export `useTemplePlayback`
- [ ] Build `StoryDialoguePanel.tsx`
- [ ] Build `app/temple/page.tsx` wiring everything together
- [ ] Add API functions to `lib/api.ts`
- [ ] Add `localStorage` guest save logic (key: `"temple_save"`)

### Phase 5 — Home Page Integration (Day 6)
- [ ] Add Game 4 card to `GAMES` array in `app/page.tsx`
- [ ] Upload thumbnail to Cloudinary (or use a placeholder SVG)
- [ ] Add `temple` to `THUMBNAIL_PUBLIC_IDS`

### Phase 6 — Polish & Testing (Day 7)
- [ ] Test all 12 levels end-to-end (Python, Java, C++)
- [ ] Test infinite recursion guard (missing base case)
- [ ] Test illegal moves guard (larger disk on smaller)
- [ ] Test guest save → login → save migration
- [ ] Mobile responsive check on `HanoiSpireCanvas`
- [ ] Write `backend/tests/test_temple_sdk.py`

---

> [!NOTE]
> **Java & C++ support**: The compiled language path in `runner.py` follows the exact same pattern as `wander_sdk/runner.py` — wrap the player's function inside a generated harness file, compile in a temp directory, run the binary, and parse JSON lines from stdout. The harness defines `Peg` and `Disk` structs that print `MOVE_DISK` JSON events on every `push()`.

> [!IMPORTANT]
> **Security**: The Python sandbox uses the same `sys.settrace` instruction counter + restricted `__builtins__` as WanderList. The `validator.py` AST pass adds an additional layer. Never allow `import`, file I/O, or `os` access in submitted code.

> [!CAUTION]
> **Recursion depth**: Python's default recursion limit is 1000. For 12 disks that's $2^{12} - 1 = 4095$ calls but maximum depth is only 12. Set `sys.setrecursionlimit(200)` inside the sandboxed exec to catch runaway recursion early and produce a friendly error message rather than a hard crash.
