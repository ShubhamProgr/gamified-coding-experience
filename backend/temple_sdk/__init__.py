"""Safe Hanoi tracing primitives for Temple of Echoes."""

from .hanoi import (
    MAX_MOVES,
    Disk,
    Peg,
    TooManyMovesError,
    build_pegs,
    clear_trace,
    get_move_count,
    get_trace,
    move,
    snapshot_pegs,
)
from .runner import TempleRunResult, run_submission
from .validator import ValidationError, validate_code

__all__ = [
    "MAX_MOVES",
    "Disk",
    "Peg",
    "TooManyMovesError",
    "build_pegs",
    "clear_trace",
    "get_move_count",
    "get_trace",
    "move",
    "snapshot_pegs",
    "TempleRunResult",
    "run_submission",
    "ValidationError",
    "validate_code",
]
