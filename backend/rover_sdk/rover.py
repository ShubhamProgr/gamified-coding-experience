"""
Rover SDK — Mock implementation.

Each method prints a structured JSON action to stdout.
The FastAPI backend captures this stdout stream and returns it to the frontend.

To add a new action:
  1. Add a method here that prints the appropriate JSON.
  2. Handle the new action type in the frontend's useRoverAnimation hook.

Language-agnostic contract: any future SDK (C++, Java, JS) simply needs
to print the same JSON schema to stdout. The backend routes by language.
"""

import json
import sys


def _emit(payload: dict) -> None:
    """Print a JSON action line to stdout (captured by FastAPI)."""
    print(json.dumps({**payload, "schema": "1.0"}), flush=True)


class Rover:
    """
    Mars Rover SDK — available as `rover` in the player's script.

    Example usage:
        rover = Rover()
        rover.drive("FRONT")
        rover.drill()
    """

    VALID_DIRECTIONS = {"FRONT", "BACK", "RIGHT", "LEFT"}

    def drive(self, direction: str) -> None:
        """Move the rover one tile in the given cardinal direction."""
        direction = direction.upper()
        if direction not in self.VALID_DIRECTIONS:
            raise ValueError(
                f"Invalid direction '{direction}'. "
                f"Must be one of: {', '.join(sorted(self.VALID_DIRECTIONS))}"
            )
        _emit({"action": "DRIVE", "direction": direction})

    def drill(self) -> None:
        """Drill into the current tile to extract minerals."""
        _emit({"action": "DRILL"})

    def scan(self) -> dict:
        """
        Scan the current tile. Returns tile metadata.
        In the mock SDK, the frontend answers this query during playback.
        """
        _emit({"action": "SCAN"})
        return {}  # Frontend resolves the real value during animation

    def charge(self, amount: int = 10) -> None:
        """Recharge the rover's battery by `amount` units (requires solar panel tile)."""
        _emit({"action": "CHARGE", "amount": int(amount)})

    def get_position(self) -> dict:
        """Return the rover's current grid position."""
        _emit({"action": "GET_POSITION"})
        return {}  # Frontend resolves the real value during animation

    def log(self, message: str) -> None:
        """Emit a custom log message visible in the console panel."""
        _emit({"action": "LOG", "message": str(message)})

    def turn_left(self) -> None:
        """Rotate the rover 90° counter-clockwise."""
        _emit({"action": "TURN", "turn": "LEFT"})

    def turn_right(self) -> None:
        """Rotate the rover 90° clockwise."""
        _emit({"action": "TURN", "turn": "RIGHT"})


# --- Injected globals so player code can do `rover = Rover()` ---
rover = Rover()
